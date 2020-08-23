const express = require('express'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  http = require('http'),
  https = require('https'),
  fs = require('fs'),
  pretty = require('pretty-log'),
  io = require('socket.io'),
  crypto = require('crypto'),
  Spotify = require('spotify-web-api-node'),
  db = require('./db');
const prettyLog = require('pretty-log');

class Track {
  constructor(source, data) {
    this.source = source
    switch (source) {
      case 'spotify': this._spotify(data); break;
    }

    this.votes = null
    this.placement = null
    this.flags = {
      up: false,
      down: false,
      report: false
    }
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
  }
}

class User {
  constructor(user) {
    this.id = user.id
    this.name = user.name
    this.mail = user.mail
    this.token = user.token
  }

  info() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      token: this.token
    }
  }
}

function apiSearch(id) {
  return new Promise((resolve, reject) => {
    if (typeof id != 'string') reject(new Error('Incorrect id'))
    spotify.getTrack(id).then(data => {
      resolve(new Track('spotify', data.body))
    }).catch(err => {
      reject(err)
    })
  })

}

function refreshToken() {
  spotify.clientCredentialsGrant().then(
    function (data) {
      pretty.log({
        data: `Spotify: New token granted`,
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
        data: 'Something went wrong when retrieving an access token',
        action: 'error'
      });
    }
  )
}

const credentials = {
  spotify: require('./spotify-cred.json')
},
  previous = {
    tracks: [],
    new(track) {
      if (Object.keys(track).length < 1) return
      pretty.log(`New track`)
      this.tracks.unshift(track)
      this._send(track)
    },
    _send(track) {
      pretty.log(`Updating previous history`)
      server.emit('previous', {
        new: track.id
      })
    },
    get() {
      if (this.tracks.length < 1) return []
      return this.tracks.slice(0, 10).map(track => track.id)
    }
  },
  player = {
    now: {},
    status: 'playing',
    set(track) {
      previous.new(this.now)
      this.now = track
      server.emit('player', {
        tid: this.now.id,
        status: this.status
      })
    },
    status(status) {
      this.status = status
      server.emit('player', {
        status: this.status
      })
    },
  },
  tracks = {
    _list: {},
    get(id) {
      return new Promise((resolve, reject) => {
        if (!this._list[id]) { // check for track in cache
          db.tracks.get(id).then(track => { // track not in cache, query db
            this.set(track)
            resolve(track)
          }).catch(err => { // track not in db, query api
            apiSearch(id).then(track => {
              this.set(track) // add to cache
              db.tracks.add(track) // add to db
              resolve(track)
            }).catch(err => {
              pretty.log({ data: err.message, action: 'error' })
            })
          })
        } else {
          resolve(this._list[id])
        }
      })
    },
    set(track) {
      this._list[track.id] = track
      return track.id
    }
  },
  chart = {
    _list: [],
    update() {
      db.votes.validAll().then(tids => {
        this._list = (Object.keys(tids).sort(function (a, b) { return tids[a] - tids[b] })).reverse()
        for (let tid in tids) {
          tracks.get(tid).then(track => {
            track.votes = tids[tid]
            track.placement = this._list.indexOf(tid) + 1
          })
        }
        return this._list
      })
    },
    get() {
      return this._list
    }
  }

var spotify = new Spotify({
  clientId: credentials.spotify.clientId,
  clientSecret: credentials.spotify.clientSecret,
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
    data: `Error: port ${port}: ${error.code}`
  })
});

www.on('listening', function () {
  pretty.log(`Listening on ${port}`)
});

setInterval(function () {
  chart.update()
  server.emit('top', chart.get())
}, 2e3)

tracks.get('11dFghVXANMlKmJXsNCbNl').then(track => player.set(track))

server.on('connection', socket => {
  pretty.log('Socket connected');

  socket.on('player', function () {
    socket.emit('player', {
      tid: player.now.id,
      status: player.status
    })
  })

  socket.on('previous', function () {
    socket.emit('previous', {
      all: previous.get()
    })
  })

  socket.on('auth', function (tokens) {
    if (tokens.local) {
      db.users.login(tokens.local).then(user => {
        socket.user = new User(user)
        pretty.log(`Socket authenticated by token.local as '${socket.user.name}'`)
        socket.emit('auth', socket.user.info())
      }).catch(err => {
        console.log('not in db')
        socket.emit('auth', {
          clear: true
        })
      })
    } else if (tokens.fb) {
      https.get(`https://graph.facebook.com/v8.0/me?fields=id,name,email&access_token=${tokens.fb}`, (resp) => {
        let data = ''
        resp.on('data', (chunk) => data += chunk)

        resp.on('end', () => {
          let creds = JSON.parse(data)
          if (creds.error) return console.error(new Error(creds.error.message))
          db.users.get(creds.id).then(user => {
            return user
          }).catch(async err => {
            pretty.log(`Creating new user with token.fb`)
            return await db.users.add(creds)
          }).then(user => {
            socket.user = new User(user)
            pretty.log(`Socket authenticated by token.fb as '${socket.user.name}'`)
            socket.emit('auth', socket.user.info())
          })
        });

      }).on("error", (err) => { throw new Error(err.message) })
    }
    // socket.emit('auth', {
    //   token: {
    //     value: 'asdasd',
    //     expires: new Date().getTime()+(1e3*60*60*24*30)
    //   }
    // })
    return


  })

  socket.on('search', function (data) {
    if (typeof data.query != 'string') return
    spotify.searchTracks(data.query)
      .then(function (data) {
        socket.emit('results', {
          tids: data.body.tracks.items.map(track => tracks.set(new Track('spotify', track))), //new Track('spotify', track)
          total: data.body.tracks.total
        })
      }, function (err) {
        console.error(err);
      });
  });

  socket.on('track', function (data) {
    tracks.get(data.query).then(track => {
      socket.emit('track', track)
    })
  })

  socket.on('flags', function (tid) {
    if (!socket.user) return
    db.votes.validUser(socket.user, tid).then(flags => {
      socket.emit('flags', {
        tid: tid,
        flags: flags
      })
    })
  })

  socket.on('vote', function (data) {
    if (!socket.user) return
    tracks.get(data.tid).then(track => {
      db.votes.add(socket.user, track, data.flag, data.comment)
    })
  })

  socket.on('top', function (data) {
    socket.emit('top', chart.get())
  })

});