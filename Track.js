class Track {
	constructor(data) {
		this.id = data.id
		this.title = data.title

		this.artists = data.artists

		this.album = data.album

		this.duration = data.duration
		this.explicit = data.explicit
		this.banned = data.banned ?? false
	}
}

export default Track
