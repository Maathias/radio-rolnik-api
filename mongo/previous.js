import Prev from '../models/Previous.js'

import { timeValid } from './votes.js'

function getPrevious(tid, from = timeValid(), to = new Date()) {
	return Prev.findOne({ tid, createdAt: { $gt: from, $lt: to } })
}

function allPrevious(from = timeValid(), to = new Date()) {
	return Prev.find({ createdAt: { $gt: from, $lt: to } }).sort({
		createdAt: -1,
	})
}

function countPrevious(tid, from = timeValid(), to = new Date()) {
	return Prev.countDocuments({
		tid,
		createdAt: { $gt: from, $lt: to ?? new Date() },
	})
}

function putPrevious(tid, timestamp) {
	return Prev.create({ tid, timestamp })
}

export { getPrevious, allPrevious, countPrevious, putPrevious }
