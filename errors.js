class DbError extends Error {
	constructor(name, message, ...args) {
		super(message, ...args)
		this.name = name ?? 'DbError'
	}
}

export { DbError }
