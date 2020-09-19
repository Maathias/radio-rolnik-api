const express = require('express'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  http = require('http'),
  https = require('https'),
  fs = require('fs'),
  pretty = require('pretty-log'),
  io = require('socket.io'),
  crypto = require('crypto'),
  SpotifyWebApi = require('spotify-web-api-node'),
  db = require('./db');

class Track {
  constructor(data, source) {
    this.source = source
    switch (source) {
      case 'spotify': this._spotify(data); break;
      case 'db': this._db(data); break;
    }

    this._listen()

    this.votes = null
    this.placement = null
    this.flag = null
  }

  _db(data) {
    this.source = data.source
    this.album = data.album
    this.artists = data.artists
    this.id = data.id
    this.duration = data.duration
    this.title = data.title
    this.banned = data.banned
    this.explicit = data.explicit
  }

  _spotify(data) {
    this.album = {
      name: data.album.name,
      image: data.album.images[0]
    }

    this.artists = []
    for (let artist of data.artists) {
      this.artists.push(artist.name)
    }

    this.id = data.id
    this.duration = data.duration_ms
    this.title = data.name
    this.explicit = data.explicit
    this.banned = false
  }

  _listen() {
    switch (this.source) {
      case 'spotify':
        this.listen = `https://open.spotify.com/track/${this.id}`
        break;
    }
  }
}

class User {
  constructor(user) {
    this.id = user.id
    this.name = user.name
    this.mail = user.mail
    this.token = user.token
    this.admin = user.admin
  }

  info() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      token: this.token,
      admin: this.admin
    }
  }
}

function apiSearch(id) {
  return new Promise((resolve, reject) => {
    if (typeof id != 'string') return reject(new Error('Incorrect id'))
    spotify.getTrack(id).then(data => {
      resolve(data.body)
    }).catch(err => {
      reject(err)
    })
  })

}

function refreshToken() {
  spotify.clientCredentialsGrant().then(
    function (data) {
      pretty.log({
        data: `Spotify: new token granted`,
        action: 'info'
      })

      credentials.spotify.lastToken = {
        value: data.body['access_token'],
        expires: new Date().getTime() + (data.body['expires_in'] * 1e3)
      }

      fs.writeFile('spotify-cred.json', JSON.stringify(credentials.spotify, null, 4), function (err) {
        if (err) throw err
      })

      spotify.setAccessToken(credentials.spotify.lastToken.value)

      setTimeout(function () {
        refreshToken()
      }, data.body['expires_in'] * 1e3)

    },
    function (err) {
      pretty.log({
        data: 'Spotify: something went wrong when retrieving an access token',
        action: 'error'
      });
    }
  )
}

const credentials = {
  spotify: require('./spotify-cred.json')
}

const Previous = {
  tracks: [],
  new(tid, played) {
    pretty.log(`Previous: new track`, 2)

    var previous = { tid: tid, played: played.getTime() }
    this.tracks.push(previous)
    this._send(previous)
  },
  _send(previous) {
    server.emit('previous', {
      new: previous,
    })
  },
  async update() {
    this.tracks = []
    for (previous of await db.history.get()) {
      this.new(previous.tid, previous.createdAt)
    }
  },
  get() {
    return {
      all: this.tracks.slice(0, 20)
    }
  }
},
  Player = {
    now: {},
    status: 'paused',
    set(track) {
      Previous.new(this.now.id, new Date)
      this.now = track
      server.emit('player', {
        tid: this.now.id,
        status: this.status
      })
      db.history.add(track.id)
    },
    update(status) {
      this.status = status
      server.emit('player', {
        status: this.status
      })
    },
  },
  Tracks = {
    _list: {},
    get(id) {
      return new Promise((resolve, reject) => {
        if (!this._list[id]) { // check for track in cache
          db.tracks.get(id).then(tdata => { // track not in cache, query db
            this.set(tdata, 'db')
            resolve(this._list[id])
          }).catch(err => { // track not in db, query api
            apiSearch(id).then(tdata => {
              this.set(tdata, 'spotify')
              db.tracks.add(this._list[id]) // add to db
              resolve(this._list[id])
            }).catch(err => { // not in api, reject
              reject(err)
              pretty.log({ data: err.message, action: 'error' })
            })
          })
        } else {
          resolve(this._list[id])
        }
      })
    },
    set(tdata, source) {
      this._list[tdata.id] = new Track(tdata, source)
      return tdata.id
    }
  },
  Chart = {
    tids: [],
    values: {},
    _serial: 0,
    _sentAt: null,
    get serial() { return this._serial },
    set serial(value) {
      this._serial = value
      this._changed = true
      if (this._serial - this._sentAt > this.threshold) { // force update after 'thershold' of votes
        this.update()
        this._changed = false
      }
    },
    _changed: true,
    delay: 30e3,
    threshold: 10,
    interval() {
      if (this._changed) {
        this.update()
        this._changed = false
      }
      setTimeout(function () { Chart.interval() }, this.delay)
    },
    async update() {
      this.values = await db.votes.validAll()
      this.tids = []

      for (let tid in this.values) {
        this.tids.push(tid)
      }

      this.tids.sort((a, b) => {
        return this.values[b].total - this.values[a].total
      })

      for (let tid in this.values) {
        let track = await Tracks.get(tid)
        track.votes = this.values[tid]
        track.placement = this.tids.indexOf(tid) + 1
        if (track.banned) this.tids.splice(this.tids.indexOf(tid), 1)
      }
      this._changed = false
      this._sentAt = this._serial
      server.emit('chart', this.get())
    },
    get() {
      return {
        tids: this.tids,
        values: this.values,
        serial: this.serial
      }
    },
  },
  Stats = {
    _online: 0,
    _auth: 0,
    _authed: {},
    get(id) {
      return {
        'online': this._online,
        'auth': this._auth
      }[id]
    },
    online() {
      return this._online
    },
    connect() {
      this._online++
    },
    disconnect() {
      this._online--
    },
    auth(socket) {
      if (!this._authed[socket.user.id]) this._authed[socket.user.id] = {}
      this._authed[socket.user.id][socket.id] = {
        user: socket.user,
        socket: socket
      }
      this._auth++
    },
    deauth(socket) {
      if (!socket.user) return
      delete this._authed[socket.user.id][socket.id]
      this._auth--
    }
  }

var spotify = new SpotifyWebApi({
  clientId: credentials.spotify.clientId,
  clientSecret: credentials.spotify.clientSecret,
  redirectUri: "https://radio-rolnik.mtps.pl/logedin"
})

if (new Date().getTime() >= credentials.spotify.lastToken.expires) {
  pretty.log({
    data: `Spotify: lastToken is expired`,
    action: 'info'
  })
  refreshToken()
} else {
  spotify.setAccessToken(credentials.spotify.lastToken.value)
  setTimeout(function () {
    pretty.log({
      data: `Spotify: current token expired`,
      action: 'info'
    })
    refreshToken()
  }, (credentials.spotify.lastToken.expires - new Date().getTime()))
}


var app = express(),
  www = http.createServer(app),
  port = 5500,
  server = io(www);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', port);

www.listen(port);

www.on('error', function (error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  pretty.log({
    data: `Error: port ${port}: ${error.code}`,
    action: 'error'
  })
});

www.on('listening', function () {
  pretty.log(`www: listening on ${port}`)
});

Chart.interval()
Previous.update()

server.on('connection', socket => {

  Stats.connect()
  pretty.log(`Socket: '${socket.id}' '${socket.handshake.headers["x-real-ip"]}' connected`, 3);

  socket.on('disconnect', function () {
    Stats.disconnect()
    if (socket.user) Stats.deauth(socket)
    pretty.log(`Socket: '${socket.id}' disconnected`, 3)
  })

  socket.on('player', function () {
    socket.emit('player', {
      tid: Player.now.id,
      status: Player.status
    })
  })

  socket.on('previous', function () {
    socket.emit('previous', Previous.get())
  })

  socket.on('clear', function (data) {
    Stats.deauth(socket)
    socket.user = undefined
  })

  socket.on('auth', function (tokens) {
    if (typeof tokens != 'object') return // validate input

    if (tokens.local) {
      if (typeof tokens.local != 'string') return // validate token
      db.users.login(tokens.local).then(udata => { // get user from db
        socket.user = new User(udata)
        socket.emit('auth', socket.user.info())
        pretty.log(`Socket: '${socket.id}' auth by token.local as '${socket.user.name}'`, 3)
        Stats.auth(socket)
      }).catch(err => { // invalid token.local
        socket.user = undefined
        socket.emit('auth', { // demand token clear
          clear: true
        })
        pretty.log(`Socket: '${socket.id}' auth by token.local failed`, 3)
      })
    } else if (tokens.fb) {
      if (typeof tokens.fb != 'string') return // validate token

      https.get(`https://graph.facebook.com/v8.0/me?fields=id,name,email&access_token=${tokens.fb}`, (resp) => {
        let data = ''
        resp.on('data', (chunk) => data += chunk)

        resp.on('end', () => {
          let creds = JSON.parse(data)
          if (creds.error) {
            socket.emit('meta', {
              type: 'error',
              action: 'auth',
              message: `Auth: there was and error with your facebook token: ${creds.error}`
            })
            return pretty.log({ data: creds.error.message, action: 'error' })
          }

          db.users.get(creds.id).then(user => { // user found in db
            return user
          }).catch(async err => { // not in db, add user
            pretty.log(`Auth: adding new user '${creds.name}'`, 3)
            return await db.users.add(creds)
          }).then(user => { // finalize auth
            socket.user = new User(user)
            socket.emit('auth', socket.user.info())
            pretty.log(`Socket: '${socket.id}' auth by token.fb as '${socket.user.name}'`, 3)
            Stats.auth(socket)
          })
        });

      }).on("error", (err) => {
        socket.emit('meta', {
          type: 'error',
          action: 'auth',
          message: `Auth: there was and error while fetching facebook data: ${err.message}`
        })
        throw err
      })
    }
  })

  socket.on('search', function (data) {
    if (typeof data != 'object') return // validate input
    if (typeof data.query != 'string') return
    if (typeof data.source != 'string') return

    if (data.source == 'spotify') {
      spotify.searchTracks(data.query)
        .then(function (response) {
          socket.emit('results', {
            tids: response.body.tracks.items.map(tdata => tdata.id),
            total: response.body.tracks.total
          })
        }, function (err) {
          socket.emit('meta', {
            type: 'error',
            action: 'search',
            message: `'${data.query}' not found: ${err.message}`
          })
          pretty.log({ data: err.message, action: 'error' });
        });
    }
  });

  socket.on('track', function (data) {
    Tracks.get(data.tid).then(track => {
      socket.emit('track', track)
    }).catch(err => {
      socket.emit('meta', {
        type: 'error',
        action: 'track',
        message: `tid '${data.tid}' not found: ${err.message}`
      })
    })
  })

  socket.on('flags', function (tid) {
    if (!socket.user) return
    db.votes.validUser(socket.user, tid).then(vote => {
      socket.emit('flags', {
        tid: tid,
        flags: vote !== null ? vote.flag : null
      })
    }).catch(err => {
      socket.emit('meta', {
        type: 'error',
        action: 'flags',
        message: `Flags: api error for '${data.query}'`
      })
    })
  })

  socket.on('vote', function (data) {
    db.votes.add(socket.user, data.tid, data.flag).then(vote => {
      Chart.serial++
    }).catch(err => {
      socket.emit('meta', {
        type: 'error',
        action: 'vote',
        message: `Vote: ignored: ${err.message}`
      })
    })
  })

  socket.on('chart', function (data) {
    socket.emit('chart', Chart.get())
  })

  socket.on('admin', function (data) {
    if (!(socket.user.admin <= 0)) return
    console.log(data)

  })

});