var AbstractClientStore = require('express-brute/lib/AbstractClientStore'),
	humps = require('humps'),
	moment = require('moment'),
	util = require('util'),
	_ = require('lodash');

var PgStore = module.exports = function (options) {
	AbstractClientStore.apply(this, arguments);

	this.options = _.extend({}, PgStore.defaults, options);
    this.pool = options.pool || new (require('pg')).Pool(this.options);
};

PgStore.prototype = Object.create(AbstractClientStore.prototype);

PgStore.prototype.set = function (key, value, lifetime, callback) {
	var self = this;

	this.pool.connect(function (err, client, done) {
		if (err) { return typeof callback === 'function' && callback(err); }

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

					return typeof callback === 'function' && callback(err);
				});
			}

			done();

			return typeof callback === 'function' && callback(err);
		});
	});
};

PgStore.prototype.get = function (key, callback) {
	var self = this;

	this.pool.connect(function (err, client, done) {
		if (err) { return typeof callback === 'function' && callback(err); }

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

					return typeof callback === 'function' && callback(err, null);
				});
			}

			done();

			return typeof callback === 'function' && callback(err, result.rowCount ? humps.camelizeKeys(result.rows[0]) : null);
		});
	});
};

PgStore.prototype.reset = function (key, callback) {
	var self = this;

	this.pool.connect(function (err, client, done) {
		if (err) { return typeof callback === 'function' && callback(err); }

		return client.query({
			text: util.format('DELETE FROM "%s"."%s" WHERE "id" = $1 RETURNING *', self.options.schemaName, self.options.tableName),
			values: [key],
			name: "brute-delete"
		}, function (err, result) {
			done();

			return typeof callback === 'function' && callback(err, result.rowCount ? humps.camelizeKeys(result.rows[0]) : null);
		});
	});
};

PgStore.defaults = {
	host: '127.0.0.1',
	schemaName: 'public',
	tableName: 'brute'
};
