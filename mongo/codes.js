import Code from '../models/Code.js'

function getCode(value) {
	return new Promise((resolve, reject) => {
		Code.findOne({ value }).then((code) => {
			resolve(code)
			if (code) {
				code.checked += 1
				code.save()
			}
		})
	})
}

function putCode(meta) {
	return Code.create(meta)
		.then((ok) => {
			resolve()
		})
		.catch((err) => console.error(err))
}

function claimCode(value, uid) {
	return new Promise((resolve, reject) => {
		Code.findOne({ value, claimed: false }).then((code) => {
			code.claimed = true
			code.claimedAt = new Date()
			code.uid = uid

			code.save().then((code) => resolve(code))
		})
	})
}

function getClaimed(uid) {
	return Code.find({ claimed: true, uid })
}

function useCode() {}

export { getCode, getClaimed, putCode, claimCode, useCode }
