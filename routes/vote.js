import express from 'express'

import db from '../db.js'
import Track from '../Track.js'

const router = express.Router()

// get multiple track stats
router.post(
	'/batch/',
	async ({ body: { tids }, headers: { authorization } }, res) => {
		var udata = false

		if (authorization) {
			if (authorization.length < 1)
				return res.status(400).end('Access token empty')

			try {
				udata = await db.users.verifyJwt(authorization)
			} catch (err) {
				return res.status(400).end('Access token invalid')
			}
		}

		if (tids === undefined)
			return res.status(400).end('List of Track ids required')
		if (tids.length < 1) return res.json([])

		Promise.all([
			Promise.all(tids.map((tid) => db.votes.getTrackStats(tid))),
			udata &&
				Promise.all(tids.map((tid) => db.votes.getUserTrack(tid, udata.id))),
		])
			.then(([stats, votes]) => {
				if (udata && votes)
					stats = stats.map((stat, i) => ({
						...stat,
						cast: votes[i]?.value ?? '',
					}))

				res.send(stats)
			})
			.catch((err) => {
				res.status(500).end('There was an error while fetching some stats')
				console.error(err)
			})
	}
)

// get tracks stats
router.get(
	'/:tid/',
	async ({ params: { tid }, headers: { authorization } }, res) => {
		var udata = false

		if (authorization) {
			if (authorization.length < 1)
				return res.status(400).end('Access token empty')

			try {
				udata = await db.users.verifyJwt(authorization)
			} catch (err) {
				return res.status(400).end('Access token invalid')
			}
		}

		if (tid === undefined) return res.status(400).end('Track ID required')

		if (tid.length < Track.idMinLength)
			return res.status(400).end('Track ID too short')

		Promise.all([
			db.votes.getTrackStats(tid),
			udata && db.votes.getUserTrack(tid, udata.id),
		])
			.then(([stats, vote]) => {
				// attatch user's vote if authorized
				if (udata) stats.cast = vote ? vote.value : '' // null vote counts as empty

				res.send(stats)
			})
			.catch((err) => {
				res.status(500).end('There was an error getting stats')
				console.error(err)
			})
	}
)

// update users vote
router.patch(
	'/:tid/',
	({ params: { tid }, body: { value }, headers: { authorization } }, res) => {
		if (authorization === undefined)
			return res.status(401).end('Access token required')

		if (authorization.length < 1)
			return res.status(400).end('Access token invalid')

		if (tid === undefined) return res.status(400).end('Track ID required')

		if (tid.length < Track.idMinLength)
			return res.status(400).end('Track ID too short')

		if (value === undefined) return res.status(400).end('Vote value required')

		if (!['up', 'down', '', 'report'].includes(value))
			return res.status(400).end('Invalid vote value')

		db.users
			.verifyJwt(authorization)
			.then(({ id }) => {
				db.votes
					.putUserTrack(tid, id, value)
					.then((ok) => {
						res.json(ok.toString())
						console.info(`vote# ${id} ${value} ${tid}`)
					})
					.catch((err) => {
						res.status(500).end('There was an error updating your vote')
						console.error(err)
					})
			})
			.catch((err) => {
				res.json('false')
				console.error(err)
			})
	}
)

export default router
