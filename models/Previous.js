import mongoose from 'mongoose'

const prev = new mongoose.Schema(
	{
		tid: String,
		timestamp: Date,
	},
	{
		collection: 'previous',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	}
)

const Prev = mongoose.model('Prev', prev)

export default Prev
export { Prev, prev }
