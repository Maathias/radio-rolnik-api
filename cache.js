import dotenv from 'dotenv'
import redis from 'redis'

dotenv.config()

const port = process.env.CACHE_PORT
const hostName = process.env.CACHE_HOST

const client = redis.createClient({ host: hostName, port })

client.on('ready', function (error) {
	console.error(`cache: connected`)
})

const cache = {
	get: (key) => {
		return new Promise((resolve, reject) => {
			client.get(key, (err, data) => {
				if (err) {
					reject(err)
				}
				resolve(data)
			})
		})
	},
	set: (key, value) => {
		client.set(key, value)
	},
}

export default cache
