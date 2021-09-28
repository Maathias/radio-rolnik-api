import express from 'express'

import db from '../db.js'
import Track from '../Track.js'

const router = express.Router()

router.post('/batch/', ({ body: { tids } }, res) => {
	if (tids === undefined) return res.status(400).end('Track ids array required')
	if (tids.length < 1) return res.send([])

	Promise.all(tids.map((tid) => db.tracks.get(tid)))
		.then((tracks) => res.send(tracks))
		.catch((err) => {
			res.status(500).end('There was an error fetching tracks ')
			console.error(err)
		})
})

router.get('/:id?', ({ params: { id } }, res) => {
	if (id === undefined) return res.status(400).end('Track ID required')
	if (id.length < Track.idMinLength)
		return res.status(400).end('Track ID too short')

	db.tracks
		.get(id)
		.then((track) => res.send(track))
		.catch((err) => {
			if ((err.name = 'DbErrorNotFound'))
				return res.status(404).end(err.message)
			else res.status(500).end('There was an error fetching track data')

			console.error(err)
		})
})

export default router
