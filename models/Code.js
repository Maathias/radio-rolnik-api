import mongoose from 'mongoose'

const code = new mongoose.Schema(
	{
		value: String,
		type: String,
		claimed: Boolean,
		claimedAt: Date,
		used: Boolean,
		usedAt: Date,
		checked: Number,
		uid: String,
	},
	{
		collection: 'codes',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	}
)

const Code = mongoose.model('Code', code)

export default Code
export { Code, code }
