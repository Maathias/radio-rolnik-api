import express from 'express'

import db from '../db.js'
import { countAllVotes } from '../mongo.js'

const router = express.Router()

function update(data) {
	if (!Array.isArray(data)) data = [data]

	db.current.update(data)
}

const playerSecret = 'Bearer ' + process.env.PLAYER_SECRET

// set current track
router.put(
	'/set/status',
	(
		{
			body: { tid = null, progress = null, duration = null, paused = null },
			headers: { authorization },
		},
		res
	) => {
		if (authorization === undefined)
			return res.status(401).end('Authorization required')

		if (authorization != playerSecret)
			return res.status(403).end('Token invalid')

		if (tid !== null)
			if (typeof tid !== 'string')
				return res.status(400).end('tid value invalid')

		if (progress !== null)
			if (typeof progress !== 'number')
				return res.status(400).end('progress value invalid')

		if (duration !== null)
			if (typeof duration !== 'number')
				return res.status(400).end('duration value invalid')

		if (paused !== null)
			if (typeof paused !== 'boolean')
				return res.status(400).end('paused value invalid')

		update({
			cat: 'status',
			content: {
				...(tid !== null && { tid }),
				...(progress !== null && { progress }),
				...(duration !== null && { duration }),
				...(paused !== null && { paused }),
			},
		})

		res.json('true')
	}
)

// set next track
router.put(
	'/set/next',
	({ body: { tid }, headers: { authorization } }, res) => {
		if (authorization === undefined)
			return res.status(401).end('Authorization required')

		if (authorization != playerSecret)
			return res.status(403).end('Token invalid')

		if (tid === undefined) return res.status(400).end('"tid" field required')

		update({
			cat: 'next',
			content: { tid },
		})

		res.json('true')
	}
)

router.get(
	'/get/top/',
	({ query: { mode = 'once' }, headers: { authorization } }, res) => {
		if (authorization === undefined)
			return res.status(401).end('Authorization required')

		if (authorization != playerSecret)
			return res.status(403).end('Token invalid')

		if (mode === 'once') {
			let morning = new Date()

			morning.setHours(8, 0, 0, 0)

			countAllVotes(morning).then((tids) => {
				res.json(tids)
			})
		} else if ((mode = 'rolling')) {
			db.top.get().then(({ top }) => {
				res.json(top)
			})
		}
	}
)

export default router
