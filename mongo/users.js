import User from '../models/User.js'

/**
 * Get User's data
 * @param {String} id
 * @returns {Promise<{}>} User data
 */
function getUser(id) {
	return new Promise((resolve, reject) => {
		User.findOne({ id })
			.then((user) => resolve(user))
			.catch((err) => reject(err))
	})
}

/**
 * Create a new User
 * @param {Object} user User data
 * @param {String} user.id User's id
 * @param {String} user.name User's display name
 * @returns
 */
function putUser({ id, name, accessToken, tokenExpires }) {
	return new Promise((resolve, reject) => {
		User.create({
			id,
			name,
			accessToken,
			tokenExpires,
			banned: false,
			perms: 0,
		})
			.then((user) => resolve(user))
			.catch((err) => reject(err))
	})
}

export { getUser, putUser }
