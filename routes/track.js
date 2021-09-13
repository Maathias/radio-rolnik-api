import express from 'express'

import { byId } from '../spotify.js'
import db from '../db.js'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Get track metadata.')
})

router.get('/:id', (req, res) => {
	if (req.query.votes) {
		return res.send({
			set: 'down',
			up: 20,
			down: 10,
		})
	}

	db.tracks
		.get(req.params.id)
		.then((track) => res.send(track))
		.catch((err) => {
			res.status(400).end()
		})
})

export default router
