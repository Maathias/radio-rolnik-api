import Jwt from 'jsonwebtoken'

import {
	getTrack,
	putTrack,
	countTrackVotes,
	getUserVote,
	updateUserVote,
	countAllVotes,
	getUser,
	putUser,
	getQuery,
	setQuery,
} from './mongo.js'

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
	next: { tid: '6BfbSHE9ytCTF910g3wNdj' },
	status: {
		tid: '3OcyTN8Nz3bdne5aq9mMR5',
		progress: 0,
		duration: 29598,
		paused: false,
		timestamp: new Date(),
	},
	previous: {
		combo: [
			['0VdSlJ7owUK1MuS8Kp7LdE', '2021-09-09T21:41:44.528Z'],
			['5svu5mLA4U2kdxPj1tLJ2I', '2021-09-09T21:41:44.528Z'],
		],
	},
}

const maxPrevious = 20

var topList = [],
	lastTop = -1

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
				// query db first
				getTrack(id)
					.then((tdata) => resolve(new Track(tdata)))
					.catch((dbErr) => {
						// track not found in DB, fetch online
						byId(id)
							.then((track) => {
								putTrack(track)
								resolve(track)
							})
							.catch((spotifyErr) => {
								reject(
									new DbError('DbErrorNotFound', `Could not retrieve track`)
								)
							})
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
		putUserTrack: updateUserVote,
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
				Jwt.verify(jwt ?? '', process.env.fbSecret, (err, decoded) => {
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
		 * @returns {Promise<[]>} Array of Track ids
		 */
		get: () => {
			return new Promise((resolve, reject) => {
				let now = new Date().getTime()

				if (now - lastTop > 1e3) {
					countAllVotes()
						.then((top) => {
							topList = top
							lastTop = now
							resolve(top)
						})
						.catch((err) => reject(err))
				} else resolve(topList)
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
			if (current.status.tid != chunk?.tid) {
				// add new [tid, date]
				current.previous.combo.unshift([
					current.status.tid,
					current.status.timestamp,
				])
				// pop on overfill
				if (current.previous.combo.length > maxPrevious)
					current.previous.combo.pop()
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

		update(data) {
			if (!Array.isArray(data)) data = [data]

			for (let { cat, content } of data) {
				this[cat] = content
			}

			broadcast(data.map((chunk) => chunk.cat))
		},
	},
}

export default db
