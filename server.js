const http = require('http')

const express = require('express')

const app = express()
app.set('view-engine', 'pug')


app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(req, res) {
  res.render('index')
})

// listen for requests :)
const server = http

const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
