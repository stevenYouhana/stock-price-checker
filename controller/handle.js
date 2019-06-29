var MongoClient = require('mongodb');
const  iex = require( 'iexcloud_api_wrapper' )
var ObjectID = MongoClient.ObjectID;
var os = require('os');
var ifaces = os.networkInterfaces();
const dotenv = require('dotenv');
dotenv.config();
const CONNECTION_STRING = process.env.DB;

const NO_STOCK = "no valid Nasdaq Stock found!";

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
        console.error("not a valid stock name");
        return false;
      }
    };
    handleStock(stock) {
      return new Promise((result, reject) => {
      var stockData;
      MongoClient.connect(CONNECTION_STRING, (err, db) => {
          db.collection('stocks')
          .findOne({stock: stock.toUpperCase()},
          {_id: 0}, (err, doc) => {
            if (err) {
              console.log("error at>>>> handleStock(stock) {")
            }
            else {
              if (!doc) {
                this.quote(stock).then((data) => {
                  if (data) {
                    stockData = {
                      clientIP: this.clientIP(),
                      stock: data.symbol,
                      price: data.latestPrice,
                      likes: this.isLiked() ? 1 : 0
                    }
                    db.collection('stocks').insert(stockData);
                    db.close();
                    result({stock: stockData.stock,
                      price: stockData.price,
                      likes: stockData.likes
                    });
                  }
                  else {
                    console.log("reject(NO_STOCK)")
                    reject(NO_STOCK);
                  }
                })
              }
              else {
                if (doc.hasOwnProperty('stock')) {
                  let ob = {stock: doc.stock, price: doc.price, likes: doc.likes};
                  if (this.isLiked()) {
                    if (doc.likes > 0 && (doc.clientIP != this.clientIP())) {
                      db.collection('stocks')
                      .update({stock: stock.toUpperCase()},
                        {$inc: {likes: 1}}, {upsert: false});
                        db.collection('stocks')
                        .update({stock: stock.toUpperCase()},
                          {$set: {clientIP: this.clientIP()}}, {upsert: false});
                        db.close();
                      result(
                        {stock: doc.stock, price: doc.price, likes: ++doc.likes}
                      );
                    }
                    else if (doc.likes === 0) {
                      db.collection('stocks')
                      .update({stock: stock.toUpperCase()},
                        {$set: {likes: 1}}, {upsert: false});
                        db.close();
                      result(
                        {stock: doc.stock, price: doc.price, likes: ++doc.likes}
                      );
                    }
                    else {
                      console.error("existing IP");
                      db.close();
                      result(
                        {stock: doc.stock, price: doc.price, likes: doc.likes}
                      );
                    }
                  }
                  else {
                    db.close();
                    result(
                      {stock: doc.stock, price: doc.price, likes: doc.likes}
                    );
                  }
                }
              }
            }
          });
        });
      });
    }
    singlePrice() {
      var stockData;
      this.handleStock(this.reqBundle.stock).then((result) => {
        setTimeout(() => {
          stockData = {'stockData': {
            stock: result.stock,
            price: result.price,
            likes: result.likes
            }
          }
          this.res.json(stockData);
        }, 0);
      }, (rejected) => {
        console.log("(rejected) => {")
        this.res.send(NO_STOCK);
      }).catch((e) => {
        console.error('e')
      });
    }
    doublePrice() {
      var stock1;
      var stock2;
      function formTheStock(obj) {
        return {
          stock: obj.stock,
          price: obj.price,
          likes: obj.likes
        }
      }
      this.handleStock(this.reqBundle.stock[0]).then((result) => {
        setTimeout(() => {
          stock1 = formTheStock(result);
        }, 0);

      }, (rej) => {
        setTimeout(() => {
          this.res.send(NO_STOCK);
        }, 0);
      }).then((result) => {
        setTimeout(() => {
          this.handleStock(this.reqBundle.stock[1]).then((result) => {
            stock2 = formTheStock(result);
          }, (rej) => {
            this.res.send(NO_STOCK);
          }).then((result) => {
            var stocks;
            if (!stock1|| !stock2) {
                this.res.send(NO_STOCK);
            }
            else {
              var rel_likes_bg;
              var rel_likes_sm;
              if (stock1.likes > stock2.likes) {
                rel_likes_bg = stock1.likes - stock2.likes;
                rel_likes_sm = stock2.likes - stock1.likes;
                stocks = [{stock: stock1.stock, price: stock1.price, rel_likes: rel_likes_bg},
                  {stock: stock2.stock, price: stock2.price, rel_likes: rel_likes_sm}];
              }
              else {
                rel_likes_sm = stock1.likes - stock2.likes;
                rel_likes_bg = stock2.likes - stock1.likes;
                stocks = [{stock: stock1.stock, price: stock1.price, rel_likes: rel_likes_sm},
                  {stock: stock2.stock, price: stock2.price, rel_likes: rel_likes_bg}];
              }
              this.res.send({'stockData': stocks});
            }
        }).catch((error) => console.error('promise error: doublePrice()'));
      }, 0);
    });
  }
}
module.exports = Handle;
