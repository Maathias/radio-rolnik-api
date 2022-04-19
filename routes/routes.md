
---

### `/track`

Get track metadata

#### `GET` `/track/:id` get track

Get track by track id

`RESPONSE`

```javascript
{
	id: String,
	title: String,
	artists: [String...],
	album: {
		name: String,
		art: String,
		year: Number,
	},
	duration: Number,	// milliseconds
	explicit: Boolean,
	banned: Boolean,
	votes: {
		up: Number,
		down: Number,
		rank: Number,
	},
}
```

#### `POST` `/batch` get tracks

Get multiple tracks by track id

`BODY`

```javascript
{
	tids: [TrackID...]
}
```

`RESPONSE`

```javascript
[
	TrackID...
]
```

---

### `/search`

Search for tracks

#### `GET` `/search/track` track search

Get a list of Track ids

`QUERY`

```javascript
{
	query: String
}
```

`RESPONSE`

```javascript
{
	tids: [TrackID...],
	total: Number
}
```

---

### `/vote`

Get and update vote values for tracks

#### `GET` `/vote/:id` get stats

Get stats of a track.
When access token is present, also get user's vote value

`HEADERS`

```javascript
{
	authorization: String
}
```

`RESPONSE`

```javascript
{
	up: Number,
	down: Number,
	rank: Number,
	cast: String	// user's vote value for track. Only if authorized
}
```

#### `POST` `/vote/batch` get multiple stats

Get stats of multiple tracks.
When access token is present, also get user's vote value per TrackID

`HEADERS`

```javascript
{
	authorization: String
}
```

`BODY`

```javascript
{
	tids: [TrackID...]
}
```

`RESPONSE`

```javascript
[
	{
		up: Number,
		down: Number,
		rank: Number,
		cast: String	// user's vote value for track. Only if authorized
	}...
]
```

#### `PATCH` `/vote/:tid` change vote value

Changes user's vote for a track

`HEADERS`

```javascript
{
	authorization: String
}
```

`BODY`

```javascript
{
	value: String // 'up', 'down', '', 'report'
}
```

`RESPONSE`

```javascript
true || false
```

---

### `/login`

Login and fetch access token

#### `GET` `/login/token` get stats

Exchange Facebook login code for an access token

`QUERY`

```javascript
{
	code: String
}
```

`RESPONSE`

```html
<body>
	Logowanie...
</body>
<script>
	window.onload = function () {
		opener.exit('<ACCESS TOKEN>')
	}
</script>
```

