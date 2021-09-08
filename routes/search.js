import express from 'express'

import { byQuery } from '../spotify.js'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Query search')
})

router.get('/track/:query', (req, res) => {
	byQuery(req.params.query).then(({ tracks, total }) => {
		res.send({
			tracks,
			total,
		})
	})
})

export default router
