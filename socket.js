import dotenv from 'dotenv'
import WebSocket, { WebSocketServer } from 'ws'

dotenv.config()

const port = process.env.portWs,
	wss = new WebSocketServer({ port: port })

console.log('ws: listening on ' + port)

function broadcast(data) {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(data))
		}
	})
}

wss.on('connection', function connection(ws) {
	console.log('connected')

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
			trackids: [
				'0VdSlJ7owUK1MuS8Kp7LdE',
				'5svu5mLA4U2kdxPj1tLJ2I',
				'6BfbSHE9ytCTF910g3wNdj',
			],
		},
	])

	ws.on('message', (message) => {
		console.log('received: %s', message)
	})

	ws.on('close', (message) => {
		console.log('disconnected')
	})
})

export { wss, broadcast }
