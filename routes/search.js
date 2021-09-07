import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Query search')
})

router.get('/track/:query', (req, res) => {
	res.send('tracks')
})

export default router
