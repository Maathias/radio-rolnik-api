import dotenv from 'dotenv'
import WebSocket, { WebSocketServer } from 'ws'
import db from './db.js'

dotenv.config()

const port = process.env.portWs,
	wss = new WebSocketServer({ port: port })

console.info('ws: listening on ' + port)

function broadcast(data) {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(data))
		}
	})
}

wss.on('connection', async function connection(ws, req) {
	console.info(`socket # ${req.headers['x-real-ip']} + `)

	function send(data) {
		ws.send(JSON.stringify(data))
	}

	send([
		{
			cat: 'previous',
			trackids: ['0VdSlJ7owUK1MuS8Kp7LdE', '5svu5mLA4U2kdxPj1tLJ2I'],
			timestamps: ['2021-09-09T21:41:44.528Z', '2021-09-09T21:41:44.528Z'],
		},
		{
			cat: 'next',
			trackid: '6BfbSHE9ytCTF910g3wNdj',
		},
		{
			cat: 'top',
			trackids: await db.top.get(),
			timestamp: db.top.lastCount,
		},
		{
			cat: 'status',
			trackid: '3OcyTN8Nz3bdne5aq9mMR5',
			progress: 0,
			paused: false,
		},
	])

	ws.on('message', (message) => console.info('received: %s', message))

	ws.on('close', (message) =>
		console.info(`socket # ${req.headers['x-real-ip']} - `)
	)
})

export { wss, broadcast }
