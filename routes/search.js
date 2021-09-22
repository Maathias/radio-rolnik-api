import express from 'express'
import db from '../db.js'

const router = express.Router()

router.get('/track/:query?', ({ params: { query } }, res) => {
	if (query === undefined) return res.status(400).end('Track ID required')
	if (query.length < 1) return res.status(400).end('Track ID invalid')

	let time = process.hrtime()
	db.search
		.query(query)
		.then(({ tids, total }) =>
			res.send({ tids, total, elapsed: process.hrtime(time) })
		)
		.catch((err) => {
			res.status(500).end('There was an error retrieving track data')
			console.error(err)
		})
})

export default router
