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
}, { collection: 'tracks', timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })),

  Vote = mongoose.model('Vote', new mongoose.Schema({
    uid: String,
    tid: String,
    flag: String,
    comment: String,
  }, { collection: 'votes', timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })),

  User = mongoose.model('User', new mongoose.Schema({
    id: String,
    name: String,
    mail: String,
    token: String,
    admin: Number,
  }, { collection: 'users', timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })),

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
    timeValid: () => {
      var monday = new Date();
      monday.setHours(0, 0, 0)
      monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);

      return monday
    },
    add(user, tid, flag) {
      return new Promise((resolve, reject) => {
        if (typeof user == 'undefined') return reject(new Error("Not authorized"))

        if (flag == 'report') {
          this.report(user, tid)
        } else this.validUser(user, tid).then(vote => {
          if (vote) {
            Vote.updateOne({
              _id: vote._id
            },
              {
                flag: flag
              }).then(status => {
                if (status.ok != 1) pretty.log({
                  data: "Vote: vote change error",
                  action: 'error'
                })
                resolve(vote)
                pretty.log(`'${user.name}' changed vote to '${flag}' on '${tid}'`, 2)
              })
          } else {
            Vote.create({
              uid: user.id,
              tid: tid,
              flag: flag
            }).then(vote => {
              resolve(vote)
              pretty.log(`'${user.name}' voted '${flag}' on '${tid}'`, 2)
            })
          }
        })
      })
    },
    report(user, tid) {
      return new Promise((resolve, reject) => {
        if (typeof user == 'undefined') return reject(new Error("Not authorized"))
        Vote.create({
          uid: user.id,
          tid: tid,
          flag: 'report',
        }).then(vote => {
          resolve(vote)
          pretty.log(`'${user.name}' reported '${tid}'`, 2)
        })
      })
    },
    validUser(user, tid) {
      return new Promise((resolve, reject) => {
        if (typeof user == 'undefined') reject(new Error(`User not authenticated`))
        Vote.findOne({
          uid: user.id,
          tid: tid,
          $or: [
            { flag: 'up' },
            { flag: 'down' },
            { flag: null }
          ],
          createdAt: {
            $gt: this.timeValid()
          }
        }, function (err, vote) {
          resolve(vote)
          // resolve({
          //   up: !!votes.find(vote => vote.flag == 'up'),
          //   down: !!votes.find(vote => vote.flag == 'down'),
          //   report: !!votes.find(vote => vote.flag == 'report')
          // })
        })
      })
    },
    validAll() {
      return new Promise((resolve, reject) => {
        Vote.find({
          createdAt: {
            // $gt: new Date(new Date().getTime() - this.timeValid)
            // $gt: new Date(new Date().setHours(0, 0, 0))
            $gt: this.timeValid()
          },
          $or: [
            { flag: 'up' },
            { flag: 'down' }
          ]
        }).then(function (votes) {
          let results = {}
          for (let vote of votes) {
            if (typeof results[vote.tid] == 'undefined') results[vote.tid] = {
              total: 0,
              up: 0,
              down: 0
            }

            results[vote.tid][vote.flag]++
            results[vote.tid].total += { 'up': 1, 'down': -1 }[vote.flag]
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