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
}

export default db
