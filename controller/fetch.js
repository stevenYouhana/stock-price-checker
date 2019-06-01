var https = require('https');

var fetchData() = function {
  https.get('https://cloud.iexapis.com/v1/', (res) => {
    console.log('RESPONSE!')
    console.log(res)
  })
}
