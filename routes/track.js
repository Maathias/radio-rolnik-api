import express from 'express'

import { byId } from '../spotify.js'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Get track metadata.')
})

router.get('/:id', (req, res) => {
	byId(req.params.id).then((track) => res.send(track))
})

export default router
