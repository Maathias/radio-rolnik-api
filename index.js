import dotenv from 'dotenv'
import express, { json, urlencoded } from 'express'
import { join } from 'path'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import fs from 'fs'
import io from 'socket.io'
import db from './db.js'

dotenv.config()

var app = express(),
	www = createServer(app),
	server = io(www)

app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())
app.set('port', process.env.port)

www.listen(process.env.port)

www.on('error', function (error) {
	if (error.syscall !== 'listen') {
		throw error
	}

	console.log(`Error: port ${process.env.port}: ${error.code}`)
})

www.on('listening', function () {
	console.log(`www: listening on ${process.env.port}`)
})

server.on('connection', (socket) => {
	console.log('socket connected')

	socket.on('disconnect', function () {
		console.log('socket gone')
	})
})
