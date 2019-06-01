
'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
const  iex = require( 'iexcloud_api_wrapper' )
var ObjectID = MongoClient.ObjectID;
var os = require('os');
var ifaces = os.networkInterfaces();

var dotenv = require('dotenv');
dotenv.config();

const CONNECTION_STRING = process.env.DB;

function clientIP() {
  var ip;
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }
      ip = iface.address;
    });
  });
  return ip;
}

module.exports = function (app) {
  const quote = async (sym) => {
    try {
      const quoteData = await iex.quote(sym);
      return quoteData;
    }
    catch (err) {
      console.error(err);
      return false;
    }
  };
  app.route('/api/stock-prices')
    .get(function(req, res) {
      var bundle = req.query;
      var result;
      function isLiked() {
        if (bundle.hasOwnProperty('like')) {
          return bundle.like == 'true' ? true : false;
        }
        return false;
      }
      MongoClient.connect(CONNECTION_STRING, function(err, db) {
        db.collection('stocks')
        .findOne({stock: bundle.stock.toUpperCase()},
        {_id: 0}, function(err, doc) {
          if (!doc) {
            quote(bundle.stock).then(function(data) {
              if (data) {
                var stockData = {
                  clientIP: clientIP(),
                  stock: data.symbol,
                  price: data.latestPrice,
                  likes: isLiked() ? 1 : 0
                }
                db.collection('stocks').insert(stockData);
                db.close();
                res.json({'stockData': {stock: stockData.stock,
                  price: stockData.price,
                  likes: stockData.likes
                }});
              }
              else {
                res.send("no valid Nasdaq Stock found!")
              }
            })
          }
          else {
            if (doc.hasOwnProperty('stock')) {
              if (doc.likes === 0) {
                if (doc.clientIP && (doc.clientIP == clientIP()) && isLiked()) {
                  db.collection('stocks')
                  .updateOne({stock: bundle.stock.toUpperCase()},
                {likes: 1}, {upsert: false});
                res.json({'stockData':
                  {stock: doc.stock, price: doc.price, likes: ++doc.likes}
                });
                }
              }
              else {
                db.close();
                res.json({'stockData':
                  {stock: doc.stock, price: doc.price, likes: doc.likes}
                });
              }
            }
          }
        });
      });
    });
};
