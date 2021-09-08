import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
	res.send('Get tracks history information (IDs only)')
})

router.get('/next', (req, res) => {
	res.send('next in queue')
})

router.get('/previous', (req, res) => {
	res.send('x previous tracks')
})

export default router
