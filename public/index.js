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
  constructor(tdata) {
    this.title = tdata.title
    this.artists = tdata.artists
    this.album = tdata.album.name
    this.albumart = tdata.album.image.url
    this.id = tdata.id
    this.duration = tdata.duration
    this.votes = tdata.votes
    this.placement = tdata.placement
    this.flag = null
    this.explicit = tdata.explicit
    this.banned = tdata.banned
    this.listen = tdata.listen
    this.played = tdata.played ? new Date(tdata.played) : null
  }

  el(options = {}) {
    var el = document.createElement('div'),
      track = document.createElement('span'),
      artist = document.createElement('span'),
      albumart = document.createElement('div'),
      icons = document.createElement('div')

    track.textContent = this.title
    track.classList.add('title')

    artist.textContent = this.artists.join(', ')
    artist.classList.add('artist')

    albumart.classList.add('albumart')
    albumart.style.backgroundImage = `url(${this.albumart})`

    // icons
    var iVotes = document.createElement('div'),
      iPlayed = document.createElement('div')

    if (this.votes) {
      iVotes.classList.add('votes')
      iVotes.append(this.votes.total, new Icon('thumbs-up'))
    }

    if (options.played) {
      var played = new Date(options.played)
      iPlayed.classList.add('played')
      iPlayed.append(`${['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'][played.getDay()]}, ${played.getHours()}:${played.getMinutes()}`)
    }

    // icons.append(this.votes)
    icons.append(iVotes, iPlayed)
    icons.classList.add('icons')

    el.append(albumart)
    el.append(track)
    el.append(document.createElement('br'))
    el.append(artist)
    el.append(icons)

    el.addEventListener('click', function () {
      Preview.goto(this.track)
    })

    el.track = this
    el.classList.add('track')
    el.classList.add(`${this.id}`)
    return el
    // let clone = this._el.cloneNode(true)
    // clone.track = this

    // return clone
  }

  tbody() {
    let minutes = parseInt(this.duration / 1e3 / 60),
      seconds = (this.duration / 1e3 - (minutes * 60)).toFixed()

    return new Table([
      ['Informacje', true],
      ['Tytuł', this.title],
      ['Autorzy', this.artists.join(', ')],
      ['Album', this.album],
      ['Czas', `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`],
      ['Top', true],
      ['Miejsce', this.placement ? `#${this.placement}` : '~'],
      ['Punkty', this.votes ? this.votes.total : '~'],
      this.votes ? ['Głosy', [new Icon('thumbs-up'), this.votes.up, ' : ', this.votes.down, new Icon('thumbs-down'), `\t${(this.votes.up / (this.votes.up + this.votes.down) * 100).toFixed(1)}%`]] : [],
      ['Metadane', true],
      ['ban', this.banned ? new Icon('check') : new Icon('check-empty')],
      ['explicit', this.explicit ? new Icon('check') : new Icon('check-empty')],
      ['id', this.id],
    ])

    // function row() {
    //   var tr = document.createElement('tr')
    //   for (let value of arguments) {
    //     let td = document.createElement('td')
    //     td.textContent = value
    //     tr.append(td)
    //   }
    //   return tr
    // }
    // var tbody = document.createElement('tbody')
    // tbody.append(row('Tytuł', this.title))
    // tbody.append(row('Autorzy', this.artists.join(', ')))
    // tbody.append(row('Album', this.album))
    // let minutes = parseInt(this.duration / 1e3 / 60),
    //   seconds = (this.duration / 1e3 - (minutes * 60)).toFixed()
    // tbody.append(row('Czas', `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`))
    // if (this.placement !== null) tbody.append(row('Miejsce', `#${this.placement}`))
    // if (this.votes !== null) tbody.append(row('Głosy', this.votes))
    // tbody.append(row('id', this.id))
    // tbody.append(row('explicit', this.explicit))
    // tbody.append(row('banned', this.banned))
    // return tbody
  }
}

class Modal {
  constructor(title, content, actions) {
    this.el = document.createElement('div')

    this.el.classList.add('modal')
    var h1 = document.createElement('h1'),
      span = document.createElement('span'),
      close = document.createElement('i'),
      buttons = document.createElement('div')
    h1.textContent = title
    span.textContent = content
    close.classList.add('icon-trash')
    close.modal = this
    close.addEventListener('click', function () {
      this.modal.destruct()
    })
    buttons.classList.add('buttons')

    for (let id in actions) {
      let i = document.createElement('i'),
        button = actions[id]
      i.classList.add(`icon-${button.icon}`)
      i.addEventListener('click', button.click)
      i.id = id
      i.modal = this
      buttons.append(i)
    }

    this.el.append(h1, span, buttons, close)
    this.el.classList.add('show')
    this.el.self = this

    document.querySelector('#modals').append(this.el)
  }

  destruct() {
    this.el.remove()
  }
}

class Table {
  constructor(content, headers = []) {
    let table = document.createElement('table'),
      thead = document.createElement('thead'),
      tbody = document.createElement('tbody')

    for (let header of headers) {
      let th = document.createElement('th')
      th.append(header)
      thead.append(th)
    }
    table.append(thead)

    for (let row of content) {
      let tr = document.createElement('tr')
      if (row[row.length - 1] === true) tr.classList.add('highlight')
      for (let column of row) {
        if (column === true) continue
        let td = document.createElement('td')
        tr.append(td)
        if (column instanceof Array) for (let element of column) td.append(element)
        else td.append(column)
      }
      tbody.append(tr)
    }
    table.append(tbody)
    return table
  }
}

class Icon {
  constructor(i) {
    if (typeof i == 'string') {
      this.i = document.createElement('i')
      this.i.icon = this
      this.i.classList.add(`icon-${i}`)
      return this.i
    } else {
      this.i = i
      this.i.icon = this
      return this
    }
  }

  change(name) {
    this.i.classList.value = ''
    this.i.classList.add(`icon-${name}`)
  }
}

pretty = {
  info(where, text) {
    console.log(`%c# ${where}${'\t'.repeat(4 - (((where.length + 2) - (where.length + 2) % 4) / 4))}${text}`, 'color: cyan')
  }
}

Tracks = {
  _list: {},
  _promises: {},
  get(tid) {
    return new Promise((resolve, reject) => {
      if (typeof tid != 'string') reject(new Error(`Incorrect track id`))
      if (!this._list[tid]) {
        if (!this._promises[tid]) {
          this._promises[tid] = []
        }
        this._promises[tid].push({ resolve: resolve, reject: reject })
        Socket.emit('track', { tid: tid })
      } else {
        resolve(this._list[tid])
      }
    })
  },
  set(track) {
    this._list[track.id] = track
    this.getFlag(track.id)
    if (this._promises[track.id]) {
      for (let promise of this._promises[track.id]) {
        promise.resolve(track)
      }
      delete this._promises[track.id]
    }
  },
  expireFlags() {
    for (let track in this._list) {
      track.flag = false
    }
  },
  getFlag(tid) {
    if (Auth.successful) Socket.emit('flags', tid)
  },
  setFlag(tid, flag) {
    this._list[tid].flag = flag
    if (Preview.track.id == tid) Preview.flags.set(flag)
  },
}

Hash = {
  current: location.hash.slice(1),
  set(target) {
    switch (target) {
      case 'preview':
        location.hash = this.setTrack(Preview.track.id)
        break;
      case 'history':
      case 'search':
      case 'chart':
      case 'settings':
      case 'admin':
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
      case 'chart':
      case 'settings':
      case 'admin':
        document.title = `radio-rolnik - ${{
          history: 'Historia',
          search: 'Wyszukaj',
          chart: 'Top',
          settings: 'Ustawienia',
          admin: 'Administracja'
        }[this.current]}`
        Panes.switch(this.current)
        gtag('event', 'pageview', {
          'page_path': location.pathname + location.hash
        });
        break;
      default:
        let tid = this.getTrack()
        if (tid == 'undefined') break;
        Tracks.get(tid).then(track => {
          document.title = `radio-rolnik - "${track.title}"`
          if (Preview.track.id != track.id) Preview.goto(track)
          gtag('event', 'pageview', {
            'page_path': location.pathname + location.hash
          });
        })
        break;
    }
  },
  setTrack(trackid) {
    return `track:${trackid}`
  },
  getTrack() {
    if (!this.current.startsWith('track:')) return
    return this.current.slice(6)
  }
}

Vote = {
  send(track, flag) {
    this._emit(track, flag)
  },
  _emit(track, flag) {
    pretty.info('Vote', `${flag}' on ${track.title}`)
    Socket.emit('vote', {
      tid: track.id,
      flag: flag
    })
  }
}

Player = {
  current: null,
  status: 'stopped',
  set(tid, status) {
    if (!tid) return
    Tracks.get(tid).then(track => {
      this.current = track
      Elements.player.current.innerHTML = ''
      Elements.player.current.append(track.el())
      if (!Object.keys(Preview.track).length) Preview.change(track)
      this._status(status)
    }).catch(err => {
      console.error(err)
    })

  },
  _status(status) {
    this.status = status
    switch (status) {
      case 'playing': this._on(); break;
      case 'paused': this._pause(); break;
      case 'stopped': this._off(); break;
    }
  },
  _off() {
    Elements.player.current.classList.add('off')
    Elements.player.volume.change('stop-circle')
  },
  _pause() {
    Elements.player.current.classList.add('off')
    Elements.player.volume.change('pause-circle')
  },
  _on() {
    Elements.player.current.classList.remove('off')
    Elements.player.volume.change('play-circled')
  }
}

Panes = {
  current: 'history',
  switch(id) {
    document.querySelector(`.pane.${this.current}`).classList.remove('active')
    document.querySelector(`#nav>.button[data-target=${this.current}]`).classList.remove('active')

    document.querySelector(`.pane.${id}`).classList.add('active')
    document.querySelector(`#nav>.button[data-target=${id}]`).classList.add('active')

    this.current = id
  }
}

Previous = {
  _list: [],
  add(previous) {
    pretty.info('Previous', `new: ${tid}`)
    Tracks.get(previous.tid).then(track => {
      Elements.previous.prepend(track.el({ played: previous.played }))
    })
  },
  refresh(previous) {
    pretty.info('Previous', `refresh`)
    Elements.previous.innerHTML = ''
    this._list = previous
    for (let tdata of previous) {
      Tracks.get(tdata.tid).then(track => {
        Elements.previous.prepend(track.el({ played: tdata.played }))
      })
    }
  }
}

Search = {
  list: [],
  update(tids, total) {
    pretty.info('Search', `${total} results`)

    Elements.search.container.innerHTML = ''
    Elements.search.info.textContent = `${total} utworów`

    for (let tid of tids) {
      Tracks.get(tid).then(track => {
        this._append(track)
      })
    }
  },
  submit() {
    var value = Elements.search.input.value
    if (value === '') return

    Elements.search.info.textContent = ''
    Socket.emit('search', {
      query: value,
      source: 'spotify'
    })
  },
  _append(result) {
    this.list.push(result)
    Elements.search.container.append(result.el())
  }
}

var Preview, Socket, Offline, Auth, Chart;

var Elements;

window.onload = function () {
  Elements = {
    player: {
      current: document.querySelector('#player>.current'),
      volume: new Icon(document.querySelector('#player>.status>.volume'))
    },
    panes: {
      history: {
        pane: document.querySelector('.pane.history'),
        button: document.querySelector('#nav>.button.history')
      },
      search: {
        pane: document.querySelector('.pane.search'),
        button: document.querySelector('#nav>.button.search')
      },
      chart: {
        pane: document.querySelector('.pane.chart'),
        button: document.querySelector('#nav>.button.chart')
      },
      preview: {
        pane: document.querySelector('.pane.preview'),
        button: document.querySelector('#nav>.button.preview')
      },
      settings: {
        pane: document.querySelector('.pane.settings'),
        button: document.querySelector('#nav>.button.settings')
      }
    },
    previous: document.querySelector('#previous'),
    search: {
      container: document.querySelector('#results'),
      info: document.querySelector('.pane.search>.query>.icons>.info'),
      input: document.querySelector('.pane.search>.query>.input'),
    },
    preview: {
      albumart: document.querySelector('.pane.preview>.albumart'),
      title: document.querySelector('.pane.preview>.title'),
      artists: document.querySelector('.pane.preview>.artists'),
      table: document.querySelector('.pane.preview>.params')
    },
    flags: {
      up: document.querySelector('.pane.preview>.buttons>.icon-thumbs-up'),
      down: document.querySelector('.pane.preview>.buttons>.icon-thumbs-down'),
      report: document.querySelector('.pane.preview>.buttons>.icon-flag')
    },
    offline: document.querySelector('#offline'),
    auth: {
      prof: document.querySelector('#profilePic'),
      username: document.querySelector('#username'),
      buttons: document.querySelector('.pane.preview>.buttons'),
      params: document.querySelector('.pane.settings>.params'),
      fbLogin: document.querySelector('.pane.settings>.actions>[data-target=fb]')
    },
    chart: document.querySelector('.chart>.list')
  }

  Preview = {
    track: {},
    flags: {
      el: {
        up: document.querySelector('.pane.preview>.buttons>.icon-thumbs-up'),
        down: document.querySelector('.pane.preview>.buttons>.icon-thumbs-down'),
        report: document.querySelector('.pane.preview>.buttons>.icon-flag'),
      },
      status: null,
      _clicked(flag, status = false) {
        if (status) Elements.flags[flag].classList.add('clicked')
        else Elements.flags[flag].classList.remove('clicked')
        return status
      },
      click(flag) {
        if (flag !== 'report') {
          if (flag === this.status) this.status = null
          else this.status = flag
        }
        this.set(this.status)
        Vote.send(Preview.track, this.status)
      },
      set(flag) {
        this._clicked('up', flag == 'up')
        this._clicked('down', flag == 'down')
        this._clicked('report', flag == 'report')
        if (flag != 'report') this.status = flag
      }
    },
    change(track) {
      pretty.info('Preview', `change: ${track.title}`)
      if (track.id == this.track.id) return
      this.track = track
      if (track.flag === false) Tracks.getFlag(track.id)

      Elements.preview.albumart.style.backgroundImage = `url('${track.albumart}')`
      Elements.preview.title.textContent = track.title
      Elements.preview.artists.textContent = track.artists.join(', ')
      Elements.preview.table.innerHTML = ''
      Elements.preview.table.append(...track.tbody().children)
      this.flags.set(track.flag)
    },
    goto(track) {
      this.change(track)
      Panes.switch('preview')
      Hash.set(`track:${this.track.id}`)
    },
    update() {
      pretty.info('Preview', `update`)

      Elements.preview.table.innerHTML = ''
      Elements.preview.table.append(...this.track.tbody().children)
    }
  }

  Offline = {
    _status: true,
    change(status) {
      if (status != this._status) {
        pretty.info('Offline', `${status}`)
        this._status = status
        status ? this._true() : this._false()
      }
    },
    _true() {
      Elements.offline.classList.remove('online')
    },
    _false() {
      Elements.offline.classList.add('online')
    },
  }

  Auth = {
    successful: false,
    autologin: Storage.Local.get('autologin') === false ? false : true,
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
      pretty.info('Auth', `Requesting response from fb`)
      FB.getLoginStatus(function (data) {
        Auth.fbRes(data)
      })
    },
    fbRes(data) {
      pretty.info('Auth', `Recieved response from fb: ${data.status}`)
      this.facebook = data
      if (data.status == 'connected') {
        Storage.Local.set('fb', this.tokens.fb = {
          value: data.authResponse.accessToken,
          expires: new Date().getTime() + (data.authResponse.expiresIn * 1e3)
        })
        this.req()
      } else {
        Elements.auth.fbLogin.classList.remove('hidden')
        this.finally(false)
      }
    },
    req() {
      pretty.info('Auth', `Requesting auth with ${this.tokens.check('fb') ? 'token.fb' : ''} ${this.tokens.local ? 'token.local' : ''}`)
      Socket.emit('auth', {
        fb: this.tokens.check('fb') ? this.tokens.fb.value : null,
        local: this.tokens.local,
      })
    },
    res(info) {
      pretty.info('Auth', `Recieved response`)
      if (!info) return this.finally(false)
      if (info.clear) {
        return this.clear()
      }
      Storage.Local.set('local', this.tokens.local = info.token)
      this.info = info
      this.finally(true)
    },
    finally(ok = false) {
      pretty.info('Auth', `finished - ${ok ? 'success' : 'failed'}`)
      if (ok) {
        this.successful = true

        Tracks.expireFlags()

        Elements.auth.buttons.classList.remove('disabled')
        Elements.auth.prof.style.backgroundImage = `url('https://graph.facebook.com/${this.info.id}/picture?type=large')`
        Elements.auth.username.textContent = this.info.name
        Elements.auth.fbLogin.classList.add('hidden')
      } else {
        this.successful = false
        Elements.auth.buttons.classList.add('disabled')
        Elements.auth.prof.style.backgroundImage = ''
        Elements.auth.username.textContent = '~'
        Elements.auth.fbLogin.classList.remove('hidden')
      }

      Elements.auth.params.innerHTML = ''
      Elements.auth.params.append(...new Table([
        ['Zalogowano', ok ? new Icon('check') : new Icon('check-empty')],
        ['Loguj automatycznie', this.autologin ? new Icon('check') : new Icon('check-empty')],
        ['Token', this.tokens.local ? new Icon('check') : new Icon('check-empty')],
        ['Facebook', this.facebook.status ? this.facebook.status : '~']
      ]).children)

    },
    auto() {
      pretty.info('Auth', `Attempting automatic auth`)
      if (!this.autologin) {
        pretty.info('Auth', `'dont' flag set, aborting auth`)
        this.finally(false)
        return
      }
      if ((this.tokens.local != '') || (this.tokens.check('fb'))) {
        this.req()
      } else {
        this.fbReq()
      }
    },
    lost() {
      this.info = {}
    },
    clear() {
      Storage.Local.set('local', this.tokens.local = '')
      Storage.Local.set('autologin', this.autologin = false)
      this.finally(false)
      Socket.emit('clear', true)
    }
  }

  Chart = {
    el: document.querySelector('.chart>.list'),
    tids: [],
    values: {},
    serial: null,
    async update(tids, values, serial) {
      if (serial === this.serial) return
      pretty.info('Chart', `update, serial '${serial}' vs '${this.serial}'`)

      this.tids = tids
      this.values = values
      this.serial = serial

      this.el.innerHTML = ''
      for (let tid of tids) {
        let track = await Tracks.get(tid)
        track.votes = values[tid]
        track.placement = tids.indexOf(tid) + 1
        this.el.append(track.el())
        if (Preview.track.id == tid) Preview.update()
      }
    }
  }

  Socket = io(`/`, {
    autoConnect: true
  })

  // ############ Click events

  // main navigation buttons
  document.querySelectorAll('#nav>.button').forEach(button => {
    button.addEventListener('click', function (e) {
      Panes.switch(this.getAttribute('data-target'))
      Hash.set(this.getAttribute('data-target'))
    })
  })

  // search input autosearch
  var keyupTimeout
  document.querySelector('.pane.search>.query>.input').addEventListener("keyup", function (e) {
    clearTimeout(keyupTimeout)
    keyupTimeout = setTimeout(function () { Search.submit() }, 1e3)
    if (e.keyCode == 13) {
      Search.submit()
      clearTimeout(keyupTimeout)
    }
  })

  // search buttons
  document.querySelector('.pane.search>.query>.icons').addEventListener('click', function (e) {
    if (e.target.classList.value.startsWith('icon-')) {
      switch (e.target.classList.value.slice(5)) {
        case 'search': Search.submit(); break;
        case 'youtube':
        case 'soundcloud-1':
        case 'spotify-1':
          new Modal('Funkcja jeszcze nie dostępna', "Wyszukiwanie piosenek z platform youtube i soundcloud jest jeszcze niedostępne")
          break;
      }
    }
  })

  // track preview buttons
  document.querySelector('.pane.preview>.buttons').addEventListener('click', function (e) {
    if (e.target.classList.value.startsWith('icon-')) {
      let target = e.target.classList.value.split(' ')[0].slice(5)
      switch (target) {
        case 'link':
          if (navigator.share) {
            navigator.share({ // returns a promise
              title: 'radio-rolnik',
              text: `Sprawdź "${Preview.track.title}" na radio-rolnik`,
              url: location.href,
            })
          }
          break;
        case 'music':
          window.open(Preview.track.listen)
          break
        case 'thumbs-up':
        case 'thumbs-down':
          if (this.classList.contains('disabled')) {
            new Modal('Zaloguj się', 'Ta akcja wymaga bycia zalogowanym przez facebooka', {
              done: {
                icon: 'check',
                click: function () {
                  this.modal.destruct()
                  Panes.switch('settings')
                }
              }
            })
            return
          }
          Preview.flags.click({
            'thumbs-up': 'up',
            'thumbs-down': 'down'
          }[target])
          break
        case 'flag':
          if (this.classList.contains('disabled')) {
            new Modal('Zaloguj się', 'Ta akcja wymaga bycia zalogowanym przez facebooka', {
              done: {
                icon: 'check',
                click: function () {
                  this.modal.destruct()
                  Panes.switch('settings')
                }
              }
            })
            return
          }
          new Modal('Zgłoś utwór', `Czy na pewno chcesz zgłosić "${Preview.track.title}"?`, {
            confirm: {
              icon: 'paper-plane',
              click: function () {
                Preview.flags.click('report')
                this.modal.destruct()
              }
            },
            cancel: {
              icon: 'cancel-circled',
              click: function () {
                this.modal.destruct()
              }
            }
          })

          break
      }
    }
  })

  // settings buttons
  document.querySelector('.pane.settings>.actions').addEventListener('click', function (e) {
    if (e.target.getAttribute('data-target')) {
      switch (e.target.getAttribute('data-target')) {
        case 'fb':
          FB.login(function (data) { Auth.fbRes(data) })
          break;
        case 'autologin':
          Auth.autologin = !Auth.autologin
          Storage.Local.set('autologin', Auth.autologin)
          if (!Auth.successful) Auth.auto()
          Auth.finally(Auth.successful)
          break;
        case 'forget':
          Auth.clear()
          break;
      }
    }
  })

  // ############ Miscellaneous

  // go to hash location
  if (location.hash == '') Hash.set('history')
  else Hash.change()

  document.body.onhashchange = function () { Hash.change() }

  // disconnect if idle
  var blurTimeout
  document.body.onfocus = function () {
    clearTimeout(blurTimeout)
    Socket.connect()
  }

  document.body.onblur = function () {
    blurTimeout = setTimeout(function () {
      Socket.disconnect()
    }, 30e3)
  }

  // ############ Socket events

  Socket.on('connect', function () {
    pretty.info('Socket', 'connected')

    Offline.change(false)
    Auth.auto()

    Socket.emit('previous')
    Socket.emit('player')
    Socket.emit('chart')
  })

  Socket.on('disconnect', function () {
    pretty.info('Socket', 'disconnected')

    Offline.change(true)
    Auth.lost()
  })

  Socket.on('auth', function (info) {
    Auth.res(info)
  })

  Socket.on('previous', function (data) {
    if (data.all) Previous.refresh(data.all)
    else if (data.new) Previous.add(data.new)
  });

  Socket.on('player', function (data) {
    Player.set(data.tid, data.status)
  });

  Socket.on('results', function (data) {
    Search.update(data.tids, data.total)
  });

  Socket.on('track', function (tdata) {
    Tracks.set(new Track(tdata))
  });

  Socket.on('flags', function (data) {
    Tracks.setFlag(data.tid, data.flags)
  });

  Socket.on('chart', function (data) {
    Chart.update(data.tids, data.values, data.serial)
  });

  Socket.on('meta', function (data) {
    new Modal('Wystąpił problem', data.message)
    console.log('meta', data)
  });

}