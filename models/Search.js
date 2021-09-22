import mongoose from 'mongoose'

const search = new mongoose.Schema(
	{
		query: String,
		market: String,
		tids: Array,
		total: Number,
	},
	{
		collection: 'search',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	}
)

const Search = mongoose.model('Search', search)

export default Search
export { Search as Vote, search as vote }
