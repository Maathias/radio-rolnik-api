import dotenv from 'dotenv'
import express, { json, urlencoded } from 'express'
import { join } from 'path'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import fs from 'fs'

import { broadcast } from './socket.js'
import db from './db.js'
import { byId } from './spotify.js'

import track from './routes/track.js'
import status from './routes/status.js'
import history from './routes/history.js'
import search from './routes/search.js'

dotenv.config()

var app = express(),
	www = createServer(app)

app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())
app.set('port', process.env.portHttp)

app.use('/track', track)
app.use('/status', status)
app.use('/history', history)
app.use('/search', search)

www.listen(process.env.portHttp)

www.on('error', function (error) {
	if (error.syscall !== 'listen') {
		throw error
	}

	console.log(`Error: port ${process.env.portHttp}: ${error.code}`)
})

www.on('listening', function () {
	console.log(`www: listening on ${process.env.portHttp}`)
})

setInterval(() => {
	broadcast({
		cat: 'status',
		trackid: '3OcyTN8Nz3bdne5aq9mMR5',
		progress: 20e3 + new Date().getMilliseconds(),
		paused: false,
	})
}, 5e3)
