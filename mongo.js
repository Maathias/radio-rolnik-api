import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

import TrackModel from './models/Track.js'
import Vote from './models/Vote.js'
import User from './models/User.js'
import Search from './models/Search.js'

const { dbHost, dbPort, dbName, dbAuth, dbUser, dbPass } = process.env

mongoose.connect(`mongodb://${dbHost}:${dbPort}/${dbName}`, {
	user: dbUser,
	pass: dbPass,
	authSource: dbAuth,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
})

const database = mongoose.connection

database.on('error', (err) => {
	throw err
})

database.once('open', () => {
	console.info(`db: connected`)
})

// #### Tracks #### #### #### #### #### #### #### ####

/**
 * Fetch track data from database
 * @param {String} id track id
 * @returns {Promise<{}>} track data
 */
function getTrack(id) {
	return new Promise((resolve, reject) => {
		TrackModel.findOne({ id })
			.then((track) => {
				if (track === null) return reject(new Error(`Tracks: ${id} not found`))
				resolve(track)
			})
			.catch((err) => reject(err))
	})
}

/**
 * Add track to database
 * @param {Track} track new track
 * @returns {Object} tdata
 */
function putTrack(track) {
	return new Promise((resolve, reject) => {
		TrackModel.create(track)
			.then((tdata) => {
				resolve(tdata)
			})
			.catch((err) => reject(err))
	})
}

export { getTrack, putTrack }

// #### Votes #### #### #### ######## #### #### ####

/**
 * Date range for valid tracks.
 * Oldest a vote can be
 * @type Date
 */
const timeValid = (() => {
	switch (process.env.timeValid) {
		default:
		case 'monday':
			var monday = new Date()
			monday.setHours(0, 0, 0)
			monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

			return monday
		case 'date':
			let date = new Date(...JSON.parse(process.env.valid_date))
			return date
	}
})()

/**
 * Fetch all valid votes for a track
 * @param {String} tid track id
 * @returns {Promise<[]>} array of votes
 */
function getVotes(tid) {
	return new Promise((resolve, reject) => {
		Vote.find({ tid, createdAt: { $gt: timeValid } })
			.then((votes) => {
				resolve(votes)
			})
			.catch((err) => reject(err))
	})
}

/**
 * Get and count all votes for a track
 * @param {String} tid
 * @returns
 */
function countTrackVotes(tid) {
	return new Promise((resolve, reject) => {
		getVotes(tid)
			.then((votes) => {
				let up = 0,
					down = 0

				for (let vote of votes) {
					vote.value == 'up' && up++
					vote.value == 'down' && down++
				}

				resolve({
					up,
					down,
				})
			})
			.catch((err) => reject(err))
	})
}

/**
 * Get User's vote value for a track
 * @param {String} tid Track id
 * @param {String} uid User id
 * @returns {Promise<{}>} user's Vote object
 */
function getUserVote(tid, uid) {
	return new Promise((resolve, reject) => {
		Vote.findOne({
			tid,
			uid,
			$or: [{ value: 'up' }, { value: 'down' }],
			createdAt: { $gt: timeValid },
		})
			.then((vote) => resolve(vote))
			.catch((err) => reject(err))
	})
}

/**
 * Update User's vote value for a track
 * @param {String} tid Track id
 * @param {String} uid User id
 * @param {('up'|'down'|'report'|'')} value new vote value
 * @returns {Promise<boolean>} vote updated?
 */
function updateUserVote(tid, uid, value) {
	return new Promise((resolve, reject) => {
		// check if vote already exists
		getUserVote(tid, uid)
			.then((vote) => {
				if (vote && (vote ?? {}).value != 'report') {
					// vote exists
					if (vote.value != value) {
						// new value is different
						Vote.updateOne({ _id: vote._id }, { value })
							.then((newVote) => {
								// updated vote
								resolve(!!newVote.ok)
							})
							.catch((err) => reject(err))
					} else {
						// unchanged value
						resolve(true)
					}
				} else {
					// create new vote
					Vote.create({ uid, tid, value })
						.then((newVote) => {
							// created vote
							resolve(!!newVote)
						})
						.catch((err) => reject(err))
				}
			})
			.catch((err) => reject(err))
	})
}

/**
 * Count votes per track and sort
 * @returns {Promise<[]>} sorted array of Track ids
 */
function countAllVotes() {
	return new Promise((resolve, reject) => {
		Vote.find({
			createdAt: { $gt: timeValid },
			$or: [{ value: 'up' }, { value: 'down' }],
		})
			.then((votes) => {
				let results = {}
				for (let { tid, value } of votes) {
					value = { up: 1, down: -1 }[value]

					results[tid] ?? (results[tid] = 0)

					results[tid] += value
				}

				const keysSorted = Object.keys(results).sort(function (a, b) {
					return results[b] - results[a]
				})

				resolve(keysSorted)
			})
			.catch((err) => reject(err))
	})
}

export {
	timeValid,
	getVotes,
	countTrackVotes,
	getUserVote,
	updateUserVote,
	countAllVotes,
}

// #### Users #### #### #### #### #### #### #### ####

/**
 * Get User's data
 * @param {String} id
 * @returns {Promise<{}>} User data
 */
function getUser(id) {
	return new Promise((resolve, reject) => {
		User.findOne({ id })
			.then((user) => resolve(user))
			.catch((err) => reject(err))
	})
}

/**
 * Create a new User
 * @param {Object} user User data
 * @param {String} user.id User's id
 * @param {String} user.name User's display name
 * @returns
 */
function putUser({ id, name, accessToken, tokenExpires }) {
	return new Promise((resolve, reject) => {
		User.create({
			id,
			name,
			accessToken,
			tokenExpires,
			banned: false,
			perms: 0,
		})
			.then((user) => resolve(user))
			.catch((err) => reject(err))
	})
}

export { getUser, putUser }

// #### Search #### #### #### #### #### #### #### ####

function getQuery(query, market) {
	return new Promise((resolve, reject) => {
		Search.findOne({
			query,
			market,
			createdAt: { $gt: new Date(new Date() - 36e5 * 24 * 2) },
		})
			.then((search) => resolve(search))
			.catch((err) => reject(err))
	})
}

function setQuery(data) {
	return new Promise((resolve, reject) => {
		Search.create(data)
			.then((search) => resolve(search))
			.catch((err) => reject(err))
	})
}

export { getQuery, setQuery }
