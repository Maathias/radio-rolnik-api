import mongoose from 'mongoose'

const track = new mongoose.Schema(
	{
		id: String,
		title: String,
		artists: [String],
		album: {
			name: String,
			art: Array,
			year: Number,
		},
		duration: Number, // milliseconds
		explicit: Boolean,
		banned: Boolean,
	},
	{
		collection: 'tracks',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	}
)

const Track = mongoose.model('Track', track)

export default Track
export { Track, track }
