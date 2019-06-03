var MongoClient = require('mongodb');
const  iex = require( 'iexcloud_api_wrapper' )
var ObjectID = MongoClient.ObjectID;
var os = require('os');
var ifaces = os.networkInterfaces();
const dotenv = require('dotenv');
dotenv.config();
const CONNECTION_STRING = process.env.DB;

class Handle {
    constructor(res, reqBundle) {
      this.res = res;
      this.reqBundle = reqBundle;
    }
    clientIP() {
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
    isLiked() {
      if (this.reqBundle.hasOwnProperty('like')) {
        return this.reqBundle.like == 'true' ? true : false;
      }
      return false;
    }
    async quote(sym) {
      try {
        const quoteData = await iex.quote(sym);
        return quoteData;
      }
      catch (err) {
        console.error(err);
        return false;
      }
    };

    singlePrice() {
      console.log("first form")
      MongoClient.connect(CONNECTION_STRING, (err, db) => {
        db.collection('stocks')
        .findOne({stock: this.reqBundle.stock.toUpperCase()},
        {_id: 0}, (err, doc) => {
          if (!doc) {
            this.quote(this.reqBundle.stock).then((data) => {
              if (data) {
                var stockData = {
                  clientIP: this.clientIP(),
                  stock: data.symbol,
                  price: data.latestPrice,
                  likes: this.isLiked() ? 1 : 0
                }
                db.collection('stocks').insert(stockData);
                db.close();
                this.res.json({'stockData': {stock: stockData.stock,
                  price: stockData.price,
                  likes: stockData.likes
                }});
              }
              else {
                this.res.send("no valid Nasdaq Stock found!")
              }
            })
          }
          else {
            if (doc.hasOwnProperty('stock')) {
              if (doc.likes === 0) {
                if (doc.clientIP && (doc.clientIP == this.clientIP()) && this.isLiked()) {
                  db.collection('stocks')
                  .update({stock: this.reqBundle.stock.toUpperCase()},
                {$set: {likes: 1}}, {upsert: false});
                this.res.json({'stockData':
                  {stock: doc.stock, price: doc.price, likes: ++doc.likes}
                });
                }
              }
              else {
                db.close();
                this.res.json({'stockData':
                  {stock: doc.stock, price: doc.price, likes: doc.likes}
                });
              }
            }
          }
        });
      });
    }
}
module.exports = Handle;
