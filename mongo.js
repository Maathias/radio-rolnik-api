import env from './env.js'
import mongoose from 'mongoose'

const { DB_HOST, DB_PORT, DB_NAME, DB_AUTH, DB_USER, DB_PASS } = env

mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
	user: DB_USER,
	pass: DB_PASS,
	authSource: DB_AUTH,
	// useNewUrlParser: true,
	// useUnifiedTopology: true,
	// useFindAndModify: false,
})

const database = mongoose.connection

export default database
