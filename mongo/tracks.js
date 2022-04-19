import TrackModel from '../models/Track.js'

/**
 * Fetch track data from database
 * @param {String} id track id
 * @returns {Promise<{}>} track data
 */
function getTrack(id) {
	return new Promise((resolve, reject) => {
		TrackModel.findOne({ id })
			.then((track) => {
				if (track === null) return reject(new Error(`Tracks: ${id} not found`))
				resolve(track)
			})
			.catch((err) => reject(err))
	})
}

/**
 * Add track to database
 * @param {Track} track new track
 * @returns {Promise<{}>} track data
 */
function putTrack(track) {
	return new Promise((resolve, reject) => {
		TrackModel.create(track)
			.then((tdata) => {
				resolve(tdata)
			})
			.catch((err) => reject(err))
	})
}

/**
 * Update track metadata
 * @param {String} tid track id
 * @param {*} newTdata values to update
 * @returns {Promise<{}>} updated track
 */
function updateTrack(id, newTdata) {
	return TrackModel.updateOne({ id }, newTdata)
}

export { getTrack, putTrack, updateTrack }
