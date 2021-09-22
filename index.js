import dotenv from 'dotenv'
import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'

import { broadcast } from './socket.js'
import db from './db.js'

import track from './routes/track.js'
import search from './routes/search.js'
import vote from './routes/vote.js'
import login from './routes/login.js'

dotenv.config()

var app = express(),
	www = createServer(app)

app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())
app.set('port', process.env.portHttp)

app.use('/track', track)
app.use('/search', search)
app.use('/vote', vote)
app.use('/login', login)

www.listen(process.env.portHttp)

www.on('error', function (error) {
	if (error.syscall !== 'listen') {
		throw error
	}

	console.info(`Error: port ${process.env.portHttp}: ${error.code}`)
})

www.on('listening', function () {
	console.info(`www: listening on ${process.env.portHttp}`)
})

var i = 0

setInterval(async () => {
	broadcast([
		{
			cat: 'status',
			trackid: db.top.list[i],
			progress: 20e3 + new Date().getMilliseconds(),
			paused: false,
		},
		{
			cat: 'top',
			trackids: await db.top.get(),
			timestamp: db.top.lastCount,
		},
	])
	i++
	if (i >= db.top.list.length) i = 0
}, 10e3)
