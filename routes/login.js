import dotenv from 'dotenv'
import express from 'express'
import got from 'got'
import Jwt from 'jsonwebtoken'
import db from '../db.js'

dotenv.config()

const router = express.Router()

const appId = process.env.FB_APPID,
	secret = process.env.FB_SECRET

router.get('/token', ({ query: { code } }, res) => {
	if (code === undefined) return res.status(400).end('Facebook code required')
	if (code.length < 1)
		return res.status(400).end('Facebook code needs to be of non zero length')

	got(
		`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${appId}&redirect_uri=${'https://radio.rolniknysa.pl/api/login/token'}&client_secret=${secret}&code=${code}`
	)
		.json()
		.then(({ access_token, expires_in }) => {
			got(`https://graph.facebook.com/me?access_token=${access_token}`)
				.json()
				.then(({ name, id }) => {
					const jwt = Jwt.sign(
						{
							name,
							id,
						},
						secret
					)

					res.end(
						`<body>Logowanie...</body><script>window.onload=function(){opener.exit(${JSON.stringify(
							{ jwt }
						)})}</script>`
					)

					db.users
						.getUser(id)
						.then((user) => {
							if (user === null)
								db.users.newUser({
									name,
									id,
									accessToken: access_token,
									tokenExpires: new Date(
										new Date().getTime() + expires_in * 1e3
									),
								})
						})
						.catch((err) => console.error(err))
				})
				.catch((err) => {
					res
						.status(400)
						.end('There was an error processing your profile information')
					console.error(err)
				})
		})
		.catch((err) => {
			res.status(400).end('There was an error requesting an access token')
			console.error(err)
		})
})

export default router
