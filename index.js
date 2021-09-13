import dotenv from 'dotenv'
import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'

import { broadcast } from './socket.js'

import track from './routes/track.js'
import history from './routes/history.js'
import search from './routes/search.js'
import vote from './routes/vote.js'

dotenv.config()

var app = express(),
	www = createServer(app)

app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())
app.set('port', process.env.portHttp)

app.use('/track', track)
app.use('/history', history)
app.use('/search', search)
app.use('/vote', vote)

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
		trackid: '2FBP8xsTWbJv3zjc1Dix0c',
		progress: 20e3 + new Date().getMilliseconds(),
		paused: false,
	})
}, 10e3)
