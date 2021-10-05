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
import player from './routes/player.js'

dotenv.config()

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

var i = 0

// setInterval(async () => {
// 	db.current.update([
// 		{
// 			cat: 'status',
// 			content: {
// 				tid: db.top.list[i],
// 			},
// 		},
// 		{
// 			cat: 'top',
// 			content: {
// 				tids: await db.top.get(),
// 				timestamp: db.top.lastCount,
// 			},
// 		},
// 	])
// 	i++
// 	if (i >= db.top.list.length) i = 0
// }, 10e3)
