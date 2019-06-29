
'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
const  iex = require( 'iexcloud_api_wrapper' )
var ObjectID = MongoClient.ObjectID;
var Handle = require('../controller/handle.js');


var os = require('os');
var ifaces = os.networkInterfaces();

var dotenv = require('dotenv');
dotenv.config();

const CONNECTION_STRING = process.env.DB;
var handle;

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

      if (Array.isArray(bundle.stock) && bundle.stock.length === 2) {
        handle = new Handle(res, bundle);
        handle.doublePrice();
      }
      else {
        handle = new Handle(res, bundle);
        handle.singlePrice();
      }
    });
};
