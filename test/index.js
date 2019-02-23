var assert = require('chai').assert;
var PgStore = require('../');

describe('express-brute Postgres store', function () {
  var instance;

  beforeEach(function () {
    instance = new PgStore({
      host: process.env.POSTGRES_HOST || 'localhost',
      database: 'brute_pg',
      user: 'postgres'
    });
  });

  afterEach(function (done) {
    instance.reset('1.2.3.4', done);
  });

  it('should be instantiable', function () {
    assert.isOk(instance);
  });

  it('should set and retrieve values for a key', function (done) {
    var curDate = new Date(),
      object = {count: 1, lastRequest: curDate, firstRequest: curDate};

    instance.set('1.2.3.4', object, 1, function (err) {
      assert.isNull(err);

      instance.get('1.2.3.4', function (err, result) {
        assert.isNull(err);
        assert.equal(result.count, object.count);
        assert.equal(result.firstRequest.getTime(), object.firstRequest.getTime());
        assert.equal(result.lastRequest.getTime(), object.lastRequest.getTime());

        done();
      });
    });
  });

  it('should increment values for a key and return the latest value', function (done) {
    var curDate = new Date(),
      object = {count: 1, lastRequest: curDate, firstRequest: curDate};

    instance.set('1.2.3.4', object, 1, function (err) {
      assert.isNull(err);

      instance.increment('1.2.3.4', 1, function (err) {
        assert.isNull(err);

        instance.get('1.2.3.4', function (err, result) {
          assert.isNull(err);

          object.count++;

          assert.equal(result.count, object.count);
          assert.equal(result.firstRequest.getTime(), object.firstRequest.getTime());
          assert.notEqual(result.lastRequest.getTime(), object.lastRequest.getTime());

          done();
        });
      });
    });
  });

  it('should initialize values if incrementing a nonexistent key', function (done) {
    instance.increment('1.2.3.4', 1, function (err) {
      assert.isNull(err);

      instance.get('1.2.3.4', function (err, result) {
        assert.isNull(err);
        assert.equal(result.count, 1);
        assert.isTrue(result.firstRequest instanceof Date);
        assert.isTrue(result.lastRequest instanceof Date);

        done();
      });
    });
  });

  it('should return null if no value is available', function (done) {
    instance.get('1.2.3.4', function (err, result) {
      assert.isNull(err);
      assert.isNull(result);

      done();
    });
  });

  it('should reset rows', function (done) {
    var curDate = new Date(),
      object = {count: 1, lastRequest: curDate, firstRequest: curDate};

    instance.set('1.2.3.4', object, 1, function (err) {
      assert.isNull(err);

      instance.reset('1.2.3.4', function (err, result) {
        assert.isNull(err);

        assert.equal(result.count, object.count);
        assert.equal(result.firstRequest.getTime(), object.firstRequest.getTime());
        assert.equal(result.lastRequest.getTime(), object.lastRequest.getTime());

        instance.get('1.2.3.4', function (err, result) {
          assert.isNull(err);
          assert.isNull(result);

          done();
        });
      });
    });
  });

  it('should expire rows', function (done) {
    var curDate = new Date(),
      object = {count: 1, lastRequest: curDate, firstRequest: curDate};

    instance.set('1.2.3.4', object, 1, function (err) {
      assert.isNull(err);

      setTimeout(function () {
        // get after .5 sec, should still be there
        instance.get('1.2.3.4', function (err, result) {
          assert.isNull(err);
          assert.equal(result.count, object.count);
          assert.equal(result.firstRequest.getTime(), object.firstRequest.getTime());
          assert.equal(result.lastRequest.getTime(), object.lastRequest.getTime());

          setTimeout(function () {
            // get after 1 sec, should have expired
            instance.get('1.2.3.4', function (err, result) {
              assert.isNull(err);
              assert.isNull(result);

              done();
            });
          }, 500);
        });
      }, 500);
    });
  });
});
