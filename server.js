// core
const http = require('http')

// npm
const express = require('express')
const level = require('level')

// setuo
const db = level('data/store.db')

// app
const app = express()
app.set('case sensitive routing', true)
app.set('strict routing', true)
app.set('views', 'views')
app.set('view engine', 'pug')
app.enable('trust proxy')

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.render('index')
})

// server
const server = http.createServer()
server.on('request', app)

const port = process.env.PORT || 3000
server.listen(port, function() {
  console.log('Listening on port ' + port)
})
