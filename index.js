import env from './env.js'

import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'

import { broadcast } from './socket.js'
import db from './db.js'

import track from './routes/track.js'
import search from './routes/search.js'
import vote from './routes/vote.js'
import login from './routes/login.js'
import player from './routes/player.js'
import admin from './routes/admin.js'
import code from './routes/code.js'

var app = express(),
	http = createServer(app)

app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())
app.set('port', process.env.HTTP_PORT)

app.use('/track', track)
app.use('/search', search)
app.use('/vote', vote)
app.use('/login', login)
app.use('/player', player)
app.use('/admin', admin)
app.use('/code', code)

http.listen(process.env.HTTP_PORT)

http.on('error', function (error) {
	if (error.syscall !== 'listen') {
		throw error
	}

	console.info(`Error: port ${process.env.HTTP_PORT}: ${error.code}`)
})

http.on('listening', function () {
	console.info(`http: listening on ${process.env.HTTP_PORT}`)
})

setInterval(() => {
	db.top.get().then(({ top, fresh }) => {
		if (fresh) {
			db.current.update({
				cat: 'top',
				content: {
					tids: top,
					timestamp: db.top.lastCount,
				},
			})
		}
	})
}, 2e3)
