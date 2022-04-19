import redis from 'redis'
import env from './env.js'

const { CACHE_PORT: port, CACHE_HOST: host } = env

const client = redis.createClient({ host, port })

client.on('ready', function (error) {
	console.info(`cache: connected`)
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
		if (typeof value !== 'string') {
			value = JSON.stringify(value)
		}
		client.set(key, value)
	},
}

export default cache
