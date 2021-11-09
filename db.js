import Jwt from 'jsonwebtoken'

import database from './mongo.js'

import {
	timeValid,
	countTrackVotes,
	getUserVote,
	updateUserVote,
	countAllVotes,
} from './mongo/votes.js'
import {
	getPrevious,
	allPrevious,
	countPrevious,
	putPrevious,
} from './mongo/previous.js'
import { getQuery, setQuery } from './mongo/search.js'
import { getTrack, putTrack, updateTrack } from './mongo/tracks.js'
import { getUser, putUser } from './mongo/users.js'
import { getCode } from './mongo/codes.js'

import redis from './redis.js'

import { byId, byQuery } from './spotify.js'
import Track from './Track.js'
import { broadcast as wsBroadcast } from './socket.js'

import { DbError } from './errors.js'

/**
 * Get Track placement in Top
 * @param {String} tid Track id
 * @returns {Number} Track's # (>0)
 */
function getTrackRank(tid) {
	const rank = topList.indexOf(tid)
	if (rank === -1) return rank
	else return rank + 1
}

function parseTop(results) {
	return new Promise(async (resolve, reject) => {
		for (let tid in results) {
			let track = await getTrack(tid)

			if (results[tid] < 0) delete results[tid] // remove negative for negative points
			if (track.banned) delete results[tid] // remove banned

			let count = await countPrevious(tid, timeValid()) // count previous plays

			if (count > 0) results[tid] = parseInt(results[tid] / (count + 1)) // halve points for every previous playback
		}

		const tids = Object.keys(results).sort(function (a, b) {
			return results[b] - results[a]
		})

		resolve(tids)
	})
}

function broadcast(cats) {
	wsBroadcast(cats.map((cat) => ({ cat, ...current[cat] })))
}

export { getTrackRank, parseTop }

const maxPrevious = 20,
	staleTop = 60e3,
	staleAfterVotes = 2

var topList = await countAllVotes().then((results) => parseTop(results)),
	lastTop = -1,
	votesSince = 0

const current = {
	next: { tid: null },
	status: {
		tid: null,
		progress: 0,
		duration: 0,
		paused: true,
		timestamp: new Date(),
	},
	previous: {
		combo: (await allPrevious())
			.slice(0, maxPrevious)
			.map(({ tid, timestamp }) => [tid, timestamp]),
	},
}

const db = {
	/**
	 * Methods for Track data
	 */
	tracks: {
		/**
		 * Get track by id.
		 * DB first, then online
		 * @param {String} id Track id
		 * @returns {Promise<Track>} Track object
		 */
		get: (id) => {
			return new Promise((resolve, reject) => {
				// try to find in redis
				redis.get(id).then((data) => {
					if (data) {
						resolve(JSON.parse(data))
					} else {
						// if not found, query db
						getTrack(id)
							.then((tdata) => {
								redis.set(id, JSON.stringify(tdata))
								resolve(new Track(tdata))
							})
							.catch((dbErr) => {
								// track not found in DB, fetch online
								byId(id)
									.then((track) => {
										putTrack(track).then((tdata) => redis.set(id, tdata))
										resolve(track)
									})
									.catch((spotifyErr) => {
										reject(
											new DbError('DbErrorNotFound', `Could not retrieve track`)
										)
									})
							})
					}
				})
			})
		},
	},
	votes: {
		/**
		 * Get Track's stats.
		 * @param {String} tid Track id
		 * @returns {Promise<{}>} Votes up and down, rank
		 */
		getTrackStats: (tid) => {
			return new Promise((resolve, reject) => {
				countTrackVotes(tid)
					.then((stats) => {
						resolve({ ...stats, rank: getTrackRank(tid) })
					})
					.catch((err) => reject(err))
			})
		},
		getUserTrack: getUserVote,
		putUserTrack: (...params) => {
			return updateUserVote(...params).then((ok) => {
				if (ok) votesSince++
				return ok
			})
		},
	},
	users: {
		getUser: getUser,
		newUser: putUser,
		/**
		 * Verify token content
		 * @param {String} jwt
		 * @returns {Promise<{}>} Decoded token content (User data)
		 */
		verifyJwt: (jwt) => {
			return new Promise((resolve, reject) => {
				Jwt.verify(jwt ?? '', process.env.FB_SECRET, (err, decoded) => {
					if (err) return reject(err)
					resolve(decoded)
				})
			})
		},
	},
	top: {
		/**
		 * Current Top tracks
		 * @type {Array} Array of Track ids
		 */
		get list() {
			return topList
		},

		/**
		 * Last date topList was updated
		 * @type {Number} Date().now
		 */
		get lastCount() {
			return lastTop
		},

		/**
		 * Get current Top tracks
		 * @returns {Promise<{}>} Array of Track ids and Fresh flag
		 */
		get: () => {
			return new Promise((resolve, reject) => {
				let now = new Date().getTime()

				// update if stale
				if (now - lastTop > staleTop || votesSince >= staleAfterVotes) {
					countAllVotes()
						.then((results) => parseTop(results))
						.then((top) => {
							topList = top // update the list
							lastTop = now // update list timestamp
							votesSince = 0 // reset number of votes since recount

							resolve({ top, fresh: true })
						})
						.catch((err) => reject(err))
				} else resolve({ top: topList, fresh: false })
			})
		},
		getTrackRank: getTrackRank,
	},
	search: {
		query: (query) => {
			return new Promise((resolve, reject) => {
				const market = 'PL'
				getQuery(query, market)
					.then((search) => {
						if (search === null) {
							byQuery(query)
								.then(({ tids, total }) => {
									const out = {
										query,
										tids,
										total,
										market,
									}

									resolve(out)
									setQuery(out)
								})
								.catch((err) => reject(err))
						} else {
							resolve({
								query: search.query,
								tids: search.tids,
								total: search.total,
								market: search.market,
							})
						}
					})
					.catch((err) => reject(err))
			})
		},
	},
	current: {
		currentTimer: null,

		get status() {
			return current.status
		},

		set status(chunk) {
			if (current.status.tid != chunk?.tid && current.status.tid) {
				// skip duplicates
				let last = current.previous.combo[0] ?? [null]

				if (last[0] !== current.status.tid) {
					const { tid, timestamp } = current.status

					current.previous.combo.unshift([tid, timestamp])

					putPrevious(tid, timestamp)

					// pop on overfill
					if (current.previous.combo.length > maxPrevious)
						current.previous.combo.pop()

					// broadcast change
					broadcast(['previous'])
				}
			}

			current.status = { ...current.status, ...chunk, timestamp: new Date() }

			clearInterval(this.currentTimer)
			let timer = (this.currentTimer = setInterval(() => {
				if (current.status.progress + 1e3 > current.status.duration) {
					current.status.progress = current.status.duration
					return clearInterval(timer)
				}

				if (!current.status.paused) current.status.progress += 1e3
			}, 1e3))
		},

		get next() {
			return current.next
		},

		set next(chunk) {
			current.next = chunk
		},

		get previous() {
			return current.previous
		},

		set top(chunk) {
			current.top = chunk
		},

		update(data) {
			if (!Array.isArray(data)) data = [data]

			for (let { cat, content } of data) {
				this[cat] = content
			}

			broadcast(data.map((chunk) => chunk.cat))
		},
	},
	admin: {
		ban: (tid) => {
			return new Promise((resolve, reject) => {
				updateTrack(tid, { banned: true })
					.then((status) => {
						getTrack(tid).then((tdata) => redis.set(tid, tdata))

						resolve(status.nModified === 1)
					})
					.catch((err) => resolve(false))
			})
		},
	},
	previous: {
		put: putPrevious,
		get: getPrevious,
		count: countPrevious,
	},
}

export default db
