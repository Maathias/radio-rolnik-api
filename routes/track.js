import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Get track metadata.')
})

router.get('/:id', (req, res) => {
	res.send('track data')
})

export default router
