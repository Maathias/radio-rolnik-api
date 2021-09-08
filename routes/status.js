import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Get currently playing track metadata.')
})

export default router
