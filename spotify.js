import SpotifyWebApi from 'spotify-web-api-node'

import Track from './Track.js'

const spotify = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

function grantToken() {
	spotify
		.clientCredentialsGrant()
		.then(
			function ({ body: { access_token, expires_in } }) {
				console.info('spotify: access token granted')

				spotify.setAccessToken(access_token)

				setTimeout(grantToken, expires_in * 1e3)
			},
			function (err) {
				throw err
			}
		)
		.catch((err) => {
			console.error(err)
		})
}

grantToken()

function byId(id) {
	return new Promise((resolve, reject) => {
		if (typeof id != 'string')
			return reject(new Error('Incorrect id, must by type String'))
		if (id.length < Track.idMinLength) return reject(new Error('Id too short'))

		spotify
			.getTrack(id)
			.then(({ body }) => {
				resolve(
					new Track({
						...body,
						title: body.name,
						artists: body.artists.map((a) => a.name),
						album: {
							name: body.album.name,
							art: body.album.images,
							year: body.album.release_date.slice(0, 4),
						},
						duration: body.duration_ms,
					})
				)
			})
			.catch((err) => reject(err))
	})
}

function byQuery(query) {
	return new Promise((resolve, reject) => {
		spotify
			.searchTracks(query, { market: 'PL' })
			.then((response) => {
				resolve({
					tids: response.body.tracks.items.map((tdata) => tdata.id),
					total: response.body.tracks.total,
				})
			})
			.catch((err) => reject(err))
	})
}

export default spotify
export { byId, byQuery }
