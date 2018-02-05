express-brute-pg
===================

[![Build Status](https://travis-ci.org/dmfay/express-brute-pg.svg?branch=master)](https://travis-ci.org/dmfay/express-brute-pg)

A PostgreSQL store for [express-brute](https://github.com/AdamPflug/express-brute) via [node-postgres](https://github.com/brianc/node-postgres).

Installation
------------
via npm:

    $ npm install express-brute-pg

express-brute-pg expects a table named `brute` (this may be overridden in the constructor) to exist in whatever database you're connecting to.

    create table brute(id text primary key, count int, first_request timestamptz, last_request timestamptz, expires timestamptz);

Usage
-----
``` js
var ExpressBrute = require('express-brute'),
	PgStore = require('express-brute-pg');

var store = new PgStore({
	host: '127.0.0.1',
	database: 'sandbox',
	username: 'appuser',
	password: 'password'
});

var bruteforce = new ExpressBrute(store);

app.post('/auth',
	bruteforce.prevent, // error 403 if we hit this route too often
	function (req, res, next) {
		res.send('Success!');
	}
);
```

Options
-------
- `host`         Postgres server host name or IP address
- `database`     Database name to connect to
- `username`     Database username
- `password`     Corresponding password, if password authentication is required
- `tableName`    Include to use a storage table named something other than `brute`
- `schemaName`   Include if your storage table is in a schema other than `public`
- `pool`         You may pass in your application's `pool` instance to `express-brute-pg` to share connection pools or use the native bindings; if not supplied, `express-brute-pg` will spin up its own pool
