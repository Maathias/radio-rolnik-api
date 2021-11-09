import mongoose from 'mongoose'

const {
	DB_HOST,
	DB_PORT,
	DB_NAME,
	dbAuth = 'admin',
	DB_USER,
	DB_PASS,
} = process.env

mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
	user: DB_USER,
	pass: DB_PASS,
	authSource: dbAuth,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
})

const database = mongoose.connection

database.on('error', (err) => {
	throw err
})

database.once('open', () => {
	console.info(`mongo: connected`)
})

export default database
