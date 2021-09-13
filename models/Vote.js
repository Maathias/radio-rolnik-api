import mongoose from 'mongoose'

const vote = new mongoose.Schema(
	{
		uid: String,
		tid: String,
		value: String,
	},
	{
		collection: 'votes',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	}
)

const Vote = mongoose.model('Vote', vote)

export default Vote
export { Vote, vote }
