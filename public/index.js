class Storage {
  static get Local() {
    return {
      get(key) {
        return JSON.parse(localStorage.getItem(key))
      },
      set(key, value) {
        value = JSON.stringify(value)
        localStorage.setItem(key, value)
        return value
      }
    }
  }
  static get Session() {
    return {
      get(key) {
        return JSON.parse(sessionStorage.getItem(key))
      },
      set(key, value) {
        value = JSON.stringify(value)
        sessionStorage.setItem(key, value)
        return value
      }
    }
  }
  static get Cookie() {
    return {
      get(key) {
        var name = key + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
          var c = ca[i];
          while (c.charAt(0) == ' ') {
            c = c.substring(1);
          }
          if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
          }
        }
        return undefined;
      },
      set(key, value, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = key + "=" + value + ";" + expires + ";path=/";
      }
    }
  }
}

class Track {
  constructor(track, flags = { up: false, down: false, report: false }) {
    this._el = document.createElement('div')
    this._tbody = document.createElement('tbody')
    this.title = track.title
    this.artists = track.artists
    this.album = track.album.name
    this.albumart = track.album.image.url
    this.id = track.id
    this.duration = track.duration
    this.votes = track.votes
    this.placement = track.placement
    this.flags = flags

    var track = document.createElement('span'),
      artist = document.createElement('span'),
      albumart = document.createElement('div'),
      icons = document.createElement('div')

    track.textContent = this.title
    track.classList.add('title')

    artist.textContent = this.artists.join(', ')
    artist.classList.add('artist')

    albumart.classList.add('albumart')
    albumart.style.backgroundImage = `url(${this.albumart})`

    var go = document.createElement('i')
    go.classList.add('icon-expand-right')
    icons.append(go)
    icons.classList.add('icons')

    this._el.append(albumart)
    this._el.append(track)
    this._el.append(document.createElement('br'))
    this._el.append(artist)
    this._el.append(icons)

    this._el.track = this
    this._el.classList.add('track')

    this._el.track = this

    this._tbody.append(this._row('Tytuł', this.title))
    this._tbody.append(this._row('Autorzy', this.artists.join(', ')))
    this._tbody.append(this._row('Album', this.album))
    let minutes = parseInt(this.duration / 1e3 / 60)
    this._tbody.append(this._row('Czas', `${minutes}:${(this.duration / 1e3 - (minutes * 60)).toFixed()}`))
    if(this.votes !== null) this._tbody.append(this._row('Głosy', this.votes))
    if(this.placement !== null)this._tbody.append(this._row('Miejsce', `#${this.placement}`))
    this._tbody.append(this._row('id', this.id))

  }

  el() {
    let clone = this._el.cloneNode(true)
    clone.track = this
    clone.addEventListener('click', function () {
      preview.goto(this.track)
    })
    return clone
  }

  tbody() {
    return this._tbody
  }

  _row() {
    var tr = document.createElement('tr')
    for (let value of arguments) {
      let td = document.createElement('td')
      td.textContent = value
      tr.append(td)
    }
    return tr
  }
}

// function checkLoginState() {
//   FB.getLoginStatus(function (response) {
//     auth.response(response)
//   });
// }

var player, panes, previous, search, preview, socket, offline, tracks, auth, hash, vote, chart;

window.onload = function () {
  player = {
    current: {},
    status: 'stopped',
    el: document.querySelector('#player>.current'),
    elVolume: document.querySelector('#player>.status>.volume'),
    set(track, status) {
      this.current = track
      this.status = status
      this.el.innerHTML = ''
      this.el.append(track.el())
      if (!Object.keys(preview.track).length) preview.change(track)
      this._status(status)
    },
    _status(status) {
      switch (status) {
        case 'playing': this._on(); break;
        case 'paused': this._pause(); break;
        case 'stopped': this._off(); break;
      }
      if (status == 'playing') {
        this._on()
      }
    },
    _off: function () {
      this.el.classList.add('off')
      this.elVolume.classList = 'icon-volume-off'
    },
    _on: function () {
      this.el.classList.remove('off')
      this.elVolume.classList = 'icon-volume-up'
    }
  }

  panes = {
    current: 'history',
    list: {
      history: {
        pane: document.querySelector('.pane.history'),
        button: document.querySelector('.nav-item.history'),
        show: true
      },
      search: {
        pane: document.querySelector('.pane.search'),
        button: document.querySelector('.nav-item.search'),
        show: false
      },
      top: {
        pane: document.querySelector('.pane.top'),
        button: document.querySelector('.nav-item.top'),
        show: false
      },
      preview: {
        pane: document.querySelector('.pane.preview'),
        button: document.querySelector('.nav-item.preview'),
        show: false
      },
      settings: {
        pane: document.querySelector('.pane.settings'),
        button: document.querySelector('.nav-item.settings'),
        show: false
      }
    },
    switch(id) {
      // hide current pane, deactivate button
      this.list[this.current].pane.classList.remove('active')
      this.list[this.current].button.classList.remove('active')
      // display new pane, activate button
      this.list[id].pane.classList.add('active')
      this.list[id].button.classList.add('active')

      this.current = id
    }
  }

  previous = {
    el: document.querySelector('#previous'),
    add(tid) {
      tracks.get(tid).then(track => {
        this.el.prepend(track.el())
      })
    },
    refresh(tids) {
      this.el.innerHTML = ''
      for (tid of tids) {
        tracks.get(tid).then(track => {
          this.el.prepend(track.el())
        })
      }
    }
  }

  search = {
    el: document.querySelector('#results'),
    elInfo: document.querySelector('.pane.search>.query>.icons>.info'),
    elInput: document.querySelector('.pane.search>.query>.input'),
    list: [],
    update(tids, total) {
      this.el.innerHTML = ''
      this.elInfo.textContent = `${total} utworów`
      for (let tid of tids) {
        tracks.get(tid).then(track => {
          this._append(track)
        })
        // var result = new Track(track)

      }
    },
    submit() {
      this.elInfo.textContent = ''
      var value = this.elInput.value
      if (value === '') return
      socket.emit('search', {
        query: value
      })
    },
    _append(result) {
      this.list.push(result)
      this.el.append(result.el())
    }
  }

  preview = {
    track: {},
    el: document.querySelector('.pane.preview'),
    albumart: document.querySelector('.pane.preview>.albumart'),
    title: document.querySelector('.pane.preview>.title'),
    artists: document.querySelector('.pane.preview>.artists'),
    tbody: document.querySelector('.pane.preview>.params'),
    flags: {
      el: {
        up: document.querySelector('.pane.preview>.buttons>.icon-thumbs-up'),
        down: document.querySelector('.pane.preview>.buttons>.icon-thumbs-down'),
        report: document.querySelector('.pane.preview>.buttons>.icon-flag'),
      },
      status: {
        up: false,
        down: false,
        report: false,
      },
      reset(flags) {
        if (typeof flags == 'undefined') var flags = preview.track.flags
        this.status = {
          up: this.clicked('up', flags.up),
          down: this.clicked('down', flags.down),
          report: this.clicked('report', flags.report),
        }
      },
      clicked(flag, status = false) {
        if (status) this.el[flag].classList.add('clicked')
        else this.el[flag].classList.remove('clicked')
        return status
      },
      set(flag, status) {
        if (this.status[flag]) return
        this.clicked(flag, status)
        this.status[flag] = true
        vote[flag](preview.track, 'komentarz')
      }
    },
    change(track) {
      if (track.id == this.track.id) return
      this.track = track

      this.albumart.style.backgroundImage = `url('${track.albumart}')`
      this.title.textContent = track.title
      this.artists.textContent = track.artists
      this.tbody.innerHTML = ''
      this.tbody.append(track.tbody())
      this.flags.reset(track.flags)
    },
    goto(track) {
      panes.switch('preview')
      this.change(track)
      hash.set(`track:${this.track.id}`)
    }
  }

  offline = {
    _status: true,
    el: document.querySelector('#offline'),
    change(status) {
      if (status != this._status) {
        this._status = status
        status ? this._true() : this._false()
      }
    },
    _true() {
      this.el.classList.remove('online')
    },
    _false() {
      this.el.classList.add('online')
    },
  }

  tracks = {
    _list: {},
    _promises: {},
    get(id) {
      return new Promise((resolve, reject) => {
        if (typeof id != 'string') reject(new Error(`Incorrect track id`))
        if (!this._list[id]) {
          if(!this._promises[id]){
            this._promises[id] = []
          }
          this._promises[id].push({ resolve: resolve, reject: reject })
          socket.emit('track', { query: id })
        } else {
          resolve(this._list[id])
        }
      })
    },
    set(track) {
      console.log(track)
      if (this._promises[track.id]){
        for(let promise of this._promises[track.id]){
          promise.resolve(track)
        }
        delete this._promises[track.id]
      }
      this._list[track.id] = track
      this.getFlags(track.id)
    },
    updateFlags() {
      for (let track in this._list) {
        this.getFlags(track)
      }
    },
    getFlags(tid) {
      if (auth.accepted) socket.emit('flags', tid)
    },
    setFlags(tid, flags) {
      this._list[tid].flags = flags
      if (preview.track.id == tid) preview.flags.reset(flags)
    }
  }

  // auth = {
  //   user: {},
  //   lastToken: {
  //     value: '',
  //     expires: 1
  //   },
  //   _response: {},
  //   try() {
  //     this.lastToken = Storage.Local.get('lastToken') || { value: '', expires: 1 }
  //     if ((this.lastToken.expires - new Date().getTime() / 1e3) > 0) {
  //       socket.connect()
  //     } else {
  //       checkLoginState()
  //     }
  //   },
  //   response(response) {
  //     this._response = response
  //     Storage.Local.set('lastToken', {
  //       value: response.authResponse.accessToken,
  //       expires: response.authResponse.data_access_expiration_time
  //     })
  //     if (response.status == 'connected') this.try()
  //     else {
  //       socket.connect()
  //     }
  //     // socket.connect()
  //     // if (this._response.status = 'connected') {
  //     //   this.send()
  //     // }
  //   },
  //   send() {
  //     socket.emit('auth', this.lastToken.value)
  //   },
  //   accepted(user) {
  //     console.log(user)
  //     this.user = user
  //     this._end()
  //     this._update()
  //   },
  //   _update() {

  //   },
  //   _end() {
  //     this._r.resolve()
  //   }
  // }

  auth = {
    accepted: false,
    info: {},
    facebook: {},
    tokens: {
      check(id) {
        return (this[id].expires - new Date().getTime()) > 0
      },
      fb: Storage.Local.get('fb') || { value: '', expires: 1 },
      local: Storage.Local.get('local') || ''
    },
    fbReq() {
      FB.getLoginStatus(function (data) {
        auth.fbRes(data)
      })
    },
    fbRes(data) {

      this.facebook = data
      if (data.status == 'connected') {
        Storage.Local.set('fb', this.tokens.fb = {
          value: data.authResponse.accessToken,
          expires: new Date().getTime() + (data.authResponse.expiresIn * 1e3)
        })
        this.req()
      } else {
        document.querySelector('#fbLogin').classList.remove('hidden')
        this.finally(false)
      }
    },
    req() {
      socket.emit('auth', {
        fb: this.tokens.check('fb') ? this.tokens.fb.value : null,
        local: this.tokens.local,
      })
    },
    res(info) {
      if (!info) return this.finally(false)
      if (info.clear) {
        this.tokens.local = ''
        return this.finally(false)
      }
      Storage.Local.set('local', this.tokens.local = info.token)
      this.info = info
      this.finally(true)
    },
    finally(ok = false) {
      if (ok) {
        this.accepted = true

        tracks.updateFlags()

        var prof = document.querySelector('#profilePic'),
          username = document.querySelector('#username'),
          fbLogin = document.querySelector('#fbLogin')

        prof.style.backgroundImage = `url('https://graph.facebook.com/${this.info.id}/picture?type=large')`
        username.textContent = this.info.name
        fbLogin.classList.add('hidden')
      } else {

      }

      socket.emit('previous')
      socket.emit('player')
      socket.emit('top')

    },
    auto() {
      if (this.tokens.local != '' || this.tokens.check('fb')) {
        this.req()
      } else {
        this.fbReq()
      }
    }
  }

  hash = {
    current: location.hash.slice(1),
    set(target) {
      switch (target) {
        case 'preview':
          this.setTrack(preview.track.id)
          break;
        case 'history':
        case 'search':
        case 'top':
        case 'settings':
          location.hash = target
          break;
        default:
          if (target.startsWith('track:')) {
            location.hash = target
          }
      }
    },
    change() {
      this.current = location.hash.slice(1)
      switch (this.current) {
        case 'history':
        case 'search':
        case 'top':
        case 'settings':
          panes.switch(this.current)
          break;
        default:
          this.getTrack()
          break;
      }
    },
    setTrack(trackid) {
      location.hash = `track:${trackid}`
    },
    getTrack() {
      if (!this.current.startsWith('track:')) return
      tracks.get(this.current.slice(6)).then(track => {
        preview.goto(track)
      })
    }
  }

  vote = {
    up(track) {
      this._send(track, 'up')
    },
    down(track) {
      this._send(track, 'down')
    },
    report(track, comment) {
      this._send(track, 'report', comment)
    },
    _send(track, flag, comment) {
      socket.emit('vote', {
        tid: track.id,
        flag: flag,
        comment: comment
      })
    }
  }

  chart = {
    el: document.querySelector('.top>.list'),
    update(tids) {
      this.el.innerHTML = ''
      for (let tid of tids) {
        tracks.get(tid).then(track => {
          this.el.append(track.el())
        })
      }
    }
  }

  // auth.responded = new Promise((resolve, reject) => {
  //   auth._r = { resolve: resolve, reject: reject }
  // })

  socket = io(`/`, {
    autoConnect: true
  })

  // ###### ###### ######
  // Click events

  for (let pane in panes.list) {
    panes.list[pane].button.onclick = function (e) {
      let target = this.getAttribute('data-target')
      panes.switch(target)
      hash.set(target)
    }
  }

  var keyupTimeout
  document.querySelector('.pane.search>.query>.input').addEventListener("keyup", function (e) {
    clearTimeout(keyupTimeout)
    keyupTimeout = setTimeout(function () { search.submit() }, 1e3)
    if (e.keyCode == 13) {
      search.submit()
      clearTimeout(keyupTimeout)
    }
  })

  document.querySelector('.pane.search>.query>.icons').addEventListener('click', function (e) {
    if (e.target.classList.value.startsWith('icon-')) {
      switch (e.target.classList.value.slice(5)) {
        case 'search': search.submit(); break;
      }
    }
  })

  document.querySelector('.pane.preview>.buttons').addEventListener('click', function (e) {
    if (e.target.classList.value.startsWith('icon-')) {
      let target = e.target.classList.value.slice(5)
      switch (target) {
        case 'link':
          if (navigator.share) {
            navigator.share({ // returns a promise
              title: 'radio-rolnik',
              text: `Sprawdź "${preview.track.title}" na radio-rolnik`,
              url: location.href,
            })
          }
          break;
        case 'thumbs-up':
        case 'thumbs-down':
        case 'flag':
          preview.flags.set({
            'thumbs-up': 'up',
            'thumbs-down': 'down',
            'flag': 'report'
          }[target], true)
          break;
      }
    }
  })

  // ###### ###### ######
  // Miscellaneous

  FB.Event.subscribe('auth.statusChange', function () { auth.auto() })

  if (location.hash == '') hash.set('history')
  else hash.change()

  document.body.onhashchange = function () { hash.change() }



  // ###### ###### ######
  // Socket events

  socket.on('connect', function () {
    offline.change(false)
    auth.auto()
  })

  socket.on('disconnect', function () {
    offline.change(true)
  })

  socket.on('auth', function (info) {
    auth.res(info)
  })

  socket.on('previous', function (data) {
    if (data.new) previous.add(data.new)
    if (data.all) previous.refresh(data.all)

    // switch (data.action) {
    //   case 'update':
    //     previous.add(new Track(data.track))
    //     break;
    //   case 'recheck':
    //     previous.recheck(data.tracks)
    //     break;
    // }
  });

  socket.on('player', function (data) {
    tracks.get(data.tid).then(track => {
      player.set(track, data.status)
    }).catch(err => {
      console.log(err)
    })
  });

  socket.on('results', function (data) {
    search.update(data.tids, data.total)
  });

  socket.on('track', function (track) {
    tracks.set(new Track(track))
  });

  socket.on('flags', function (data) {
    tracks.setFlags(data.tid, data.flags)
  });

  socket.on('top', function (tids) {
    chart.update(tids)
  });

}