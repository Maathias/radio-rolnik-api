const mongoose = require('mongoose'),
  credentials = require('./mongo-cred.json'),
  pretty = require('pretty-log'),
  crypto = require('crypto')

mongoose.connect("mongodb://odin.home.mathew.pl:27017/radio-rolnik", {
  auth: credentials.auth,
  user: credentials.user,
  pass: credentials.pass,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
db = mongoose.connection

db.on('error', err => {
  throw err
});
db.once('open', () => {
  pretty.log(`DB connected`)
});

var trackSchema = new mongoose.Schema({
  id: String,
  title: String,
  album: {
    name: String,
    image: {
      width: Number,
      height: Number,
      url: String
    }
  },
  artists: Array,
  duration: Number,
  source: String
}, { collection: 'tracks' })

var Track = mongoose.model('Track', trackSchema)

var userSchema = new mongoose.Schema({
  id: String,
  name: String,
  mail: String,
  token: String
}, { collection: 'users' })

var voteSchema = new mongoose.Schema({
  uid: String,
  tid: String,
  flag: String,
  comment: String
}, { collection: 'votes', timestamps: { createdAt: 'createdAt' } })

var Vote = mongoose.model('Vote', voteSchema),
  User = mongoose.model('User', userSchema)

module.exports = {
  users: {
    get(id) {
      return new Promise((resolve, reject) => {
        User.findOne({ id: id }).exec(function (err, user) {
          if (err) throw new Error(err)
          if (user === null) {
            reject(null)
          } else resolve(user)
        })
      })
    },
    login(token) {
      return new Promise((resolve, reject) => {
        User.findOne({ token: token }).exec(function (err, user) {
          if (err) throw new Error(err)
          if (user === null) {
            reject(null)
          } else resolve(user)
        })
      })
    },
    add(creds) {
      return new Promise((resolve, reject) => {
        User.create({
          id: creds.id,
          name: creds.name,
          mail: creds.email,
          token: crypto.randomBytes(20).toString('hex')
        }, function (err, user) {
          resolve(user)
        })
      })
    }
  },
  votes: {
    timeValid: 60 * 60 * 12, // seconds
    add(user, track, flag, comment) {
      pretty.log(`'${user.name}' voted '${flag}' on '${track.title}'`)
      return new Promise((resolve, reject) => {
        Vote.create({
          uid: user.id,
          tid: track.id,
          flag: flag,
          comment: comment
        }, function (err, vote) {
          resolve(vote)
        })
      })
    },
    validUser(user, tid) {
      return new Promise((resolve, reject) => {
        if (typeof user == 'undefined') reject(new Error(`User not authenticated`))
        Vote.find({
          uid: user.id,
          tid: tid,
          createdAt: {
            $gt: new Date(new Date().getTime() - 12 * 60 * 60 * 1e3)
          }
        }, function (err, votes) {
          // console.log(votes.map(vote => [vote.tid, vote.flag]))
          resolve({
            up: !!votes.find(vote => vote.flag == 'up'),
            down: !!votes.find(vote => vote.flag == 'down'),
            report: !!votes.find(vote => vote.flag == 'report')
          })
        })
      })
    },
    validTrack(track) { },
    validAll() {
      return new Promise((resolve, reject) => {
        Vote.find({
          createdAt: {
            $gt: new Date(new Date().getTime() - 12 * 60 * 60 * 1e3)
          }
        }).then(function (votes) {
          let results = {}
          for (let vote of votes.map(vote => [vote.tid, vote.flag])) {
            if (typeof results[vote[0]] == 'undefined') results[vote[0]] = 0
            if (vote[1] == 'up') results[vote[0]] += 1
            if (vote[1] == 'down') results[vote[0]] -= 1
          }
          resolve(results)
        })
      })

    },
  },
  tracks: {
    get(id) {
      return new Promise((resolve, reject) => {
        Track.findOne({
          id: id
        }).then(track => {
          if(track === null){
            reject(new Error(`Track not found`))
          }
          resolve(track)
        }).catch(err => {
          reject(err)
        })
      })
    },
    add(track) {
      return new Promise((resolve, reject) => {
        Track.findOneAndUpdate(
          {id: track.id}, // find
          {
            id: track.id,
            title: track.title,
            album: track.album,
            artists: track.artists,
            duration: track.duration,
            source: track.source
          }, // update
          { upsert: true }) // create if doesn't exist
        .then(track => {
          resolve(track)
        })


          return
        Track.create({
          id: track.id,
          title: track.title,
          album: track.album,
          artists: track.artists,
          duration: track.duration,
          source: track.source
        }).then(track => {
          resolve(track)
        })
      })
    }
  }
}