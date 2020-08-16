const express = require('express'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  http = require('http'),
  pretty = require('pretty-log'),

  Spotify = require('spotify-web-api-node')

const credentials = {
  spotify: require('./spotify-cred.json')
}

var spotify = new Spotify({
  clientId: credentials.spotify.clientId,
  clientSecret: credentials.spotify.clientSecret,
})

spotify.clientCredentialsGrant().then(
  function (data) {
    pretty.log({
      data: `Spotify token is ${data.body['access_token']}, expiring in ${data.body['expires_in']}`,
      action: 'info'
    })

    // Save the access token so that it's used in future calls
    spotify.setAccessToken(data.body['access_token']);

    spotify.searchTracks('Love')
      .then(function (data) {
        console.log(data.body.tracks.items);
      }, function (err) {
        console.error(err);
      });
  },
  function (err) {
    pretty.log({
      data: 'Something went wrong when retrieving an access token',
      action: 'error'
    });
  }
)

var app = express(),
  server = http.createServer(app),
  port = 5500;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', port);

server.listen(port);

server.on('error', function (error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  pretty.log({
    data: `Error: port ${port}: ${error.code}`
  })
});

server.on('listening', function () {
  pretty.log(`Listening on ${port}`)
});