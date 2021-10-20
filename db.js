import Jwt from 'jsonwebtoken'

import {
	getTrack,
	putTrack,
	updateTrack,
	countTrackVotes,
	getUserVote,
	updateUserVote,
	countAllVotes,
	getUser,
	putUser,
	getQuery,
	setQuery,
} from './mongo.js'
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

function broadcast(cats) {
	wsBroadcast(cats.map((cat) => ({ cat, ...current[cat] })))
}

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
		combo: [],
	},
}

const maxPrevious = 20

var topList = [],
	lastTop = -1,
	votesSince = 0

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

		get changed() {
			return
		},
		/**
		 * Get current Top tracks
		 * @returns {Promise<{}>} Array of Track ids and Fresh flag
		 */
		get: () => {
			return new Promise((resolve, reject) => {
				let now = new Date().getTime()

				if (now - lastTop > 60e3 || votesSince >= 2) {
					countAllVotes()
						.then((top) => {
							return Promise.all(top.map((tid) => getTrack(tid)))
						})
						.then((top) => {
							return top.filter(({ banned }) => !banned).map(({ id }) => id)
						})
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
			// console.log(current.status.tid, chunk?.tid)
			if (current.status.tid != chunk?.tid && current.status.tid) {
				// skip duplicates
				let last = current.previous.combo[0] ?? [null]

				if (last[0] !== current.status.tid) {
					// add new [tid, date]
					current.previous.combo.unshift([
						current.status.tid,
						current.status.timestamp,
					])

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
}

export default db
