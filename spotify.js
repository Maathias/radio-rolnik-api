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
		if (id.length < 22) return reject(new Error('Id too short'))

		spotify
			.getTrack(id)
			.then(({ body }) => {
				let tdata = {
					...body,
					title: body.name,
					artists: body.artists.map((a) => a.name),
					album: {
						name: body.album.name,
						art: body.album.images[0].url,
						year: body.album.release_date.slice(0, 4),
					},
					duration: body.duration_ms,
				}
				resolve(new Track(tdata))
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
