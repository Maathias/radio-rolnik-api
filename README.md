# radio-rolnik API

Backend server for radio-rolnik

## Resources

Frontend - [Maathias/radio-rolnik](https://github.com/Maathias/radio-rolnik/)

Player - [Maathias/radio-rolnik-player](https://github.com/Maathias/radio-rolnik-player/)

## .env

`.dev.env` will be loaded with `NODE_ENV=development`, otherwise 'production' is used by default.

`.env` file is required for production build. It should contain variables defined below.

```ini
HTTP_DOMAIN= <frontend domain>

SPOTIFY_CLIENT_ID= <spotify api id>
SPOTIFY_CLIENT_SECRET= <spotify api secret>

PLAYER_SECRET= <remote player secret>

FB_APPID= <facebook api id>
FB_SECRET= <facebook api secret>
```

Some of the required variables is provided in `docker-compose.yml`

```ini
HTTP_PORT=3010
WS_PORT=3020

<mongo and redis variables>
...
```

The rest can be probably left with default values

```ini
DB_PORT= 27017,
DB_AUTH= 'admin',

TOP_TIME_VALID= 'period',
TOP_TIME_VALUE= 604800,

CACHE_PORT= 6379,
```

## Usage

`yarn dev` for development, or 
`yarn start` for running standalone.
(Made on Node v16)

`docker-compose up` for running in a docker container. Make sure a `.env` file isn't missing before building.

With default ports, the app assumes a nginx config:

 - frontend hosted on `/`

 - `/api/` passed to `HTTP_PORT`

 - `/ws/` passed to `WS_PORT`

MongoDB data volume is mapped to `.data/mongo`

## Routes

API paths and responses are described in [routes.md](routes/routes.md)