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
var database = mongoose.connection

database.on('error', err => {
  throw err
});
database.once('open', () => {
  pretty.log(`DB connected`)
});

var Track = mongoose.model('Track', new mongoose.Schema({
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
  source: String,
  explicit: Boolean,
  banned: Boolean
}, { collection: 'tracks' })),

  Vote = mongoose.model('Vote', new mongoose.Schema({
    uid: String,
    tid: String,
    flag: String,
    comment: String
  }, { collection: 'votes', timestamps: { createdAt: 'createdAt' } })),

  User = mongoose.model('User', new mongoose.Schema({
    id: String,
    name: String,
    mail: String,
    token: String,
    admin: Number
  }, { collection: 'users' })),

  Previous = mongoose.model('Previous', new mongoose.Schema({
    tid: String
  }, { collection: 'history', timestamps: { createdAt: 'createdAt', updatedAt: false } }))

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
    timeValid: 60 * 60 * 12 * 1e3, // ms
    add(user, track, flag) {
      return new Promise((resolve, reject) => {
        if (typeof user == 'undefined') return reject(new Error("Not authorized"))
        this.validUser(user, track.id).then(flags => {
          if (flags[flag]) {
            reject(new Error("Already voted"))
          } else {
            Vote.create({
              uid: user.id,
              tid: track.id,
              flag: flag
            }).then(vote => {
              resolve(vote)
              pretty.log(`'${user.name}' voted '${flag}' on '${track.title}'`)
            })
          }
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
            $gt: new Date(new Date().setHours(0, 0, 0))
          }
        }, function (err, votes) {
          resolve({
            up: !!votes.find(vote => vote.flag == 'up'),
            down: !!votes.find(vote => vote.flag == 'down'),
            report: !!votes.find(vote => vote.flag == 'report')
          })
        })
      })
    },
    validAll() {
      return new Promise((resolve, reject) => {
        var monday = new Date();
        monday.setHours(0, 0, 0)
        monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
        Vote.find({
          createdAt: {
            // $gt: new Date(new Date().getTime() - this.timeValid)
            // $gt: new Date(new Date().setHours(0, 0, 0))
            $gt: monday
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
          if (track === null) return reject(new Error(`Tracks: ${id} not found`))
          resolve(track)
        }).catch(err => {
          reject(err)
        })
      })
    },
    add(track) {
      return new Promise((resolve, reject) => {
        Track.findOneAndUpdate(
          { id: track.id }, // find
          {
            id: track.id,
            title: track.title,
            album: track.album,
            artists: track.artists,
            duration: track.duration,
            source: track.source,
            explicit: track.explicit,
            banned: track.banned || false,
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
  },
  history: {
    get() {
      return new Promise((resolve, reject) => {
        Previous.find({}, {}, { limit: 20 }).then(previous => {
          resolve(previous)
        })
      })
    },
    add(tid) {
      return new Promise((resolve, reject) => {
        Previous.create({
          tid: tid
        }).then(previous => {
          resolve(previous)
        })
      })
    }
  }
}