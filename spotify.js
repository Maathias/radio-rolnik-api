import SpotifyWebApi from 'spotify-web-api-node'

import Track from './Track.js'

const spotify = new SpotifyWebApi({
	clientId: 'c9cd1ede71914999a75fbea35313c1a4',
	clientSecret: '13858e98eb264cf78251072f2ea5e96d',
})

spotify.clientCredentialsGrant().then(
	function (data) {
		console.log('Spotify: access token granted')

		// Save the access token so that it's used in future calls
		spotify.setAccessToken(data.body['access_token'])
	},
	function (err) {
		throw err
	}
)

function byId(id) {
	return new Promise((resolve, reject) => {
		if (typeof id != 'string')
			return reject(new Error('Incorrect id, must by type String'))

		spotify
			.getTrack(id)
			.then((data) => {
				resolve(new Track(data.body))
			})
			.catch((err) => {
				reject(err)
			})
	})
}

function byQuery(query) {
	return new Promise((resolve, reject) => {
		spotify
			.searchTracks(query)
			.then((response) => {
				resolve({
					tracks: response.body.tracks.items.map((tdata) => tdata.id),
					total: response.body.tracks.total,
				})
			})
			.catch((err) => {
				reject(err)
			})
	})
}

export default spotify
export { byId, byQuery }
