import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

import { byId } from './spotify.js'
import Track from './Track.js'

import { Track as TrackModel } from './models/Track.js'
import Vote from './models/Vote.js'

const { dbHost, dbPort, dbName, dbAuth, dbUser, dbPass } = process.env

mongoose.connect(`mongodb://${dbHost}:${dbPort}/${dbName}`, {
	user: dbUser,
	pass: dbPass,
	authSource: 'admin',
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

// #### #### #### ####
// #### Tracks

function getTrack(id) {
	return new Promise((resolve, reject) => {
		TrackModel.findOne({ id })
			.then((track) => {
				if (track === null) return reject(new Error(`Tracks: ${id} not found`))
				resolve(track)
			})
			.catch((err) => {
				reject(err)
			})
	})
}

function putTrack(track) {
	return new Promise((resolve, reject) => {
		TrackModel.create(track).then((tdata) => {
			resolve(tdata)
		})
	})
}

// #### #### #### ####
// #### Votes

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

function getVotes(tid) {
	return new Promise((resolve, reject) => {
		Vote.find({ tid, createdAt: { $gt: timeValid } })
			.then((votes) => {
				resolve(votes)
			})
			.catch((err) => reject(err))
	})
}

function countVotes(tid) {
	return new Promise((resolve, reject) => {
		getVotes(tid).then((votes) => {
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
	})
}

function getUserVote(tid, uid) {
	return new Promise((resolve, reject) => {
		Vote.findOne({ tid, uid, createdAt: { $gt: timeValid } })
			.then((vote) => resolve(vote))
			.catch((err) => reject(err))
	})
}

function updateUserVote(tid, uid, value) {
	return new Promise((resolve, reject) => {
		// check if vote already exists
		getUserVote(tid, uid).then((vote) => {
			if (vote) {
				// vote exists
				if (vote.value != value) {
					// new value is different
					Vote.updateOne({ _id: vote._id }, { value }).then((newVote) => {
						// updated vote
						resolve(!!newVote.ok)
					})
				} else {
					// unchanged value
					resolve(true)
				}
			} else {
				// create new vote
				Vote.create({ uid, tid, value }).then((newVote) => {
					// created vote
					resolve(!!newVote)
				})
			}
		})
	})
}

const db = {
	tracks: {
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
								console.error(spotifyErr)
								reject(new Error(`Could not retrieve track`))
							})
					})
			})
		},
		put: putTrack,
	},
	votes: {
		getTrack: (tid) => {},
		getTrackStats: countVotes,
		getUser: (uid) => {},
		getUserTrack: getUserVote,
		putUserTrack: updateUserVote,
	},
}

export default db
