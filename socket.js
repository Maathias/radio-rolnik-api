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
			...db.current.previous,
		},
		{
			cat: 'next',
			...db.current.next,
		},
		{
			cat: 'top',
			tids: await db.top.get(),
			timestamp: db.top.lastCount,
		},
		{
			cat: 'status',
			...db.current.status,
		},
	])

	ws.on('message', (message) => console.info('received: %s', message))

	ws.on('close', (message) =>
		console.info(`socket # ${req.headers['x-real-ip']} - `)
	)
})

export { wss, broadcast }
