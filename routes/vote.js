import express from 'express'

import db from '../db.js'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Vote for track.')
})

router.get('/:id/', ({ params }, res) => {
	db.votes.getTrackStats(params.id).then((stats) => {
		res.send(stats)
	})
})

router.get('/:id/cast', ({ params, query }, res) => {
	db.votes.getUserTrack(params.id, query.uid).then((vote) => {
		res.send(vote ? vote.value : '')
	})
})

router.patch('/:id/', ({ params, body }, res) => {
	db.votes.putUserTrack(params.id, body.uid, body.value).then((vote) => {
		res.end(JSON.stringify(vote))
	})
})

export default router
