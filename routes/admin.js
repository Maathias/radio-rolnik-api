import express from 'express'
import db from '../db.js'

const router = express.Router()

router.get('/ban', ({ query: { tid }, headers: { authorization } }, res) => {
	if (authorization === undefined)
		return res.status(401).end('Access token required')

	if (authorization.length < 1)
		return res.status(400).end('Access token invalid')

	db.users
		.verifyJwt(authorization)
		.then(({ perms }) => {
			if (perms > 0) {
				db.admin.ban(tid).then((ok) => {
					res.json(ok.toString())
				})
			}
		})
		.catch((err) => {
			res.json('false')
			console.error(err)
		})
})

export default router
