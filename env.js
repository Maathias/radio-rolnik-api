import dotenv from 'dotenv'

const NODE_ENV = process.env.NODE_ENV,
	dotfile = {
		production: '.env',
		development: '.dev.env',
	}[NODE_ENV ?? 'production']

console.info(`env: ${NODE_ENV}`)

const config = dotenv.config({ path: `./${dotfile}` })

if (config.error) throw `enviroment file ${dotfile} not found`

const env = {
	HTTP_PORT: -1,
	HTTP_DOMAIN: '',
	WS_PORT: -1,

	SPOTIFY_CLIENT_ID: '',
	SPOTIFY_CLIENT_SECRET: '',

	DB_HOST: '',
	DB_PORT: 27017,
	DB_AUTH: 'admin',
	DB_NAME: '',
	DB_USER: '',
	DB_PASS: '',

	PLAYER_SECRET: '',
	TOP_TIME_VALID: 'period',
	TOP_TIME_VALUE: 604800,

	FB_APPID: '',
	FB_SECRET: '',

	CACHE_HOST: '',
	CACHE_PORT: 6379,
}

for (let key in env) {
	process.env[key] && (env[key] = env[key].constructor(process.env[key]))
}

export default env
