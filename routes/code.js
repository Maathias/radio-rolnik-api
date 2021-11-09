import express from 'express'

import db from '../db.js'

import { getCode, claimCode, getClaimed } from '../mongo/codes.js'

const router = express.Router()

const descriptions = {
	top16: `Pozwala na gwarantowane miejsce w Topce dla wybranego przez ciebie utworu.
	Działa tylko po Zajęciu a następnie Aktywacji.
	Aktywny kod, działa na ostatni utwór na który zagłosujesz przed 8:00 następnego dnia`,
}

router.get('/info/:c', ({ params: { c } }, res) => {
	getCode(c).then((code) => {
		if (code) {
			res.json({
				value: code.value,
				type: code.type,
				claimed: code.claimed,
				used: code.used,
				checked: code.checked,
				desc: descriptions[code.type],
			})
		} else {
			res.status(404).end()
		}
	})
})

router.get('/list/', ({ headers: { authorization } }, res) => {
	if (authorization === undefined)
		return res.status(401).end('Access token required')

	if (authorization.length < 1)
		return res.status(400).end('Access token invalid')

	db.users
		.verifyJwt(authorization)
		.then(({ id }) => {
			getClaimed(id).then((list) => res.json(list))
		})
		.catch((err) => {
			console.error(err)
			res.status(403).end('Could not validate token')
		})
})

router.post(
	'/claim/:c',
	({ params: { c }, headers: { authorization } }, res) => {
		if (authorization === undefined)
			return res.status(401).end('Access token required')

		if (authorization.length < 1)
			return res.status(400).end('Access token invalid')

		if (c === undefined) return res.status(400).end('Code required')

		if (c.length < 1) return res.status(400).end('Code invalid')

		db.users
			.verifyJwt(authorization)
			.then(({ id }) => {
				claimCode(c, id).then((code) => {
					if (code.claimed && code.uid == id) {
						res.json('true')
					} else res.json('false')
				})
			})
			.catch((err) => {
				console.error(err)
				res.status(403).end('Could not validate token')
			})
	}
)

export default router
