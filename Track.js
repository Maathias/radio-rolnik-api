class Track {
	constructor(data) {
		this.id = data.id
		this.title = data.name

		this.artists = data.artists.map((a) => a.name)

		this.album = {
			name: data.album.name,
			art: data.album.images[0].url,
			year: data.album.release_date.slice(0, 4),
		}

		this.duration = data.duration_ms
		this.explicit = data.explicit
		this.banned = false

		this.votes = {
			up: 100,
			down: 50,
			rank: 1,
		}
	}
}

export default Track
