
var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');
var Handle = require('../controller/handle.js');
var handle = new Handle();
var checkForDoubleLikes;
chai.use(chaiHttp);

suite('Functional Tests', function() {

    suite('GET /api/stock-prices => stockData object', function() {

      test('1 stock', function(done) {
        this.timeout(120000)
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'i'})
        .end(function(err, res) {
          if (err) console.error('if (err)');
          else {
            assert.equal(res.status, 200);
            assert.isObject(res.body.stockData);
            assert.property(res.body.stockData, 'stock');
            assert.property(res.body.stockData, 'price');
            assert.property(res.body.stockData, 'likes');
            assert.equal(res.body.stockData.stock, 'I');
            assert.isNumber(res.body.stockData.price);
            assert.isNumber(res.body.stockData.likes);
            done();
          }
        });
      });

      test('1 stock with like', function(done) {
        this.timeout(120000)
        chai.request(server)
        .get('/api/stock-prices/')
        .query({stock: 'aig', likes: true})
        .end(function(err, res) {
          checkForDoubleLikes = res.body.stockData.likes;
          assert.equal(res.status, 200);
          assert.property(res.body.stockData, 'stock');
          assert.property(res.body.stockData, 'price');
          assert.property(res.body.stockData, 'likes');
          assert.equal(res.body.stockData.stock, 'AIG');
          assert.isNumber(res.body.stockData.price);
          assert.isNumber(res.body.stockData.likes);
          done();
        });
      });

      test('1 stock with like again (ensure likes arent double counted)', function(done) {
        this.timeout(120000)
        chai.request(server)
        .get('/api/stock-prices/')
        .query({stock: 'aig', likes: true})
        .end(function(err, res) {
          var ip = handle.clientIP();
          assert.isNumber(res.body.stockData.likes);
          assert.isFalse(res.body.stockData.clientIP == ip);
          assert.equal(res.body.stockData.likes, checkForDoubleLikes);
          done();
        });
      });

      test('2 stocks', function(done) {
        this.timeout(120000)
        chai.request(server)
        .get('/api/stock-prices')
        .query({stock: ['goog', 'tsla'], likes: true})
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.property(res.body.stockData[0], 'stock');
          assert.property(res.body.stockData[1], 'price');
          assert.property(res.body.stockData[0], 'rel_likes');
          assert.equal(res.body.stockData[0].stock, ['GOOG']);
          assert.equal(res.body.stockData[1].stock, ['TSLA']);
          done();
        });
      });

      test('2 stocks with like', function(done) {
        this.timeout(120000);
        chai.request(server)
        .get('/api/stock-prices/')
        .query({stock: ['goog', 'tsla'], likes: true})
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.property(res.body.stockData[0], 'stock');
          assert.property(res.body.stockData[1], 'price');
          assert.property(res.body.stockData[1], 'rel_likes');
          assert.equal(res.body.stockData[0].stock, ['GOOG']);
          assert.equal(res.body.stockData[1].stock, ['TSLA']);
          done();
        });
      });
    });

});
