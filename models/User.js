import mongoose from 'mongoose'

const user = new mongoose.Schema(
	{
		id: String,
		name: String,
		accessToken: String,
		tokenExpires: Date,
		banned: Boolean,
		perms: Number,
	},
	{
		collection: 'users',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	}
)

const User = mongoose.model('User', user)

export default User
export { User, user }
