import Search from '../models/Search.js'

function getQuery(query, market) {
	return new Promise((resolve, reject) => {
		Search.findOne({
			query,
			market,
			createdAt: { $gt: new Date(new Date() - 36e5 * 24 * 2) },
		})
			.then((search) => resolve(search))
			.catch((err) => reject(err))
	})
}

function setQuery(data) {
	return new Promise((resolve, reject) => {
		Search.create(data)
			.then((search) => resolve(search))
			.catch((err) => reject(err))
	})
}

export { getQuery, setQuery }
