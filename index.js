var AbstractClientStore = require('express-brute/lib/AbstractClientStore'),
	humps = require('humps'),
	moment = require('moment'),
	util = require('util'),
	_ = require('underscore');

var PgStore = module.exports = function (options) {
	AbstractClientStore.apply(this, arguments);

	this.options = _.extend({}, PgStore.defaults, options);
	this.pg = options.pg || require('pg');	// allow passing in native pg client
};

PgStore.prototype = Object.create(AbstractClientStore.prototype);

PgStore.prototype.connect = function (callback) {
	this.pg.connect('postgres://' + this.options.username + ':' + this.options.password + '@' + this.options.host + '/' + this.options.database, callback);
};

PgStore.prototype.set = function (key, value, lifetime, callback) {
	var self = this;

	this.connect(function (err, client, done) {
		if (err) { return callback(err); }

		var expiry;

		if (lifetime) { expiry = moment().add(lifetime, 'seconds').toDate(); }

		client.query({
			text: util.format('UPDATE "%s"."%s" SET "count" = $1, "last_request" = $2, "expires" = $3 WHERE "id" = $4', self.options.schemaName, self.options.tableName),
			values: [value.count, value.lastRequest, expiry, key],
			name: "brute-update"
		}, function (err, result) {
			if (!err && !result.rowCount) {
				return client.query({
					text: util.format('INSERT INTO "%s"."%s" ("id", "count", "first_request", "last_request", "expires") VALUES ($1, $2, $3, $4, $5)', self.options.schemaName, self.options.tableName),
					values: [key, value.count, value.firstRequest, value.lastRequest, expiry],
					name: "brute-insert"
				}, function (err, result) {
					done();

					callback(err);
				});
			}

			done();

			callback(err);
		});
	});
};

PgStore.prototype.get = function (key, callback) {
	var self = this;

	this.connect(function (err, client, done) {
		if (err) { return callback(err); }

		client.query({
			text: util.format('SELECT "id", "count", "first_request", "last_request", "expires" FROM "%s"."%s" WHERE "id" = $1', self.options.schemaName, self.options.tableName),
			values: [key],
			name: "brute-select"
		}, function (err, result) {
			if (!err && result.rows.length && new Date(result.rows[0].expires).getTime() < new Date().getTime()) {
				return client.query({
					text: util.format('DELETE FROM "%s"."%s" WHERE "id" = $1', self.options.schemaName, self.options.tableName),
					values: [key],
					name: "brute-delete"
				}, function (err) {
					done();

					callback(err, null);
				});
			}

			done();

			callback(err, result.rowCount ? humps.camelizeKeys(result.rows[0]) : null);
		});
	});
};

PgStore.prototype.reset = function (key, callback) {
	var self = this;

	this.connect(function (err, client, done) {
		if (err) { return callback(err); }

		return client.query({
			text: util.format('DELETE FROM "%s"."%s" WHERE "id" = $1 RETURNING *', self.options.schemaName, self.options.tableName),
			values: [key],
			name: "brute-delete"
		}, function (err, result) {
			done();

			callback(err, result.rowCount ? humps.camelizeKeys(result.rows[0]) : null);
		});
	});
};

PgStore.defaults = {
	host: '127.0.0.1',
	schemaName: 'public',
	tableName: 'brute'
};