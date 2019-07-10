// core
const http = require('http')
const crypto = require('crypto')

// npm
const express = require('express')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const level = require('level')
const ms = require('ms')

// setup
const githubAppSecret = process.env.GITHUB_APP_SECRET
const sessionKey = process.env.SESSION_KEY
const db = level('.data/store.db')

function checkGitHubSignature(req, res, next) {
  
  const hmac = crypto.createHmac('sha1', githubAppSecret)

  hmac.update(req.body)
  console.log(hmac.digest('hex'))
  // Prints:
  //   7fd04df92f636fd450bc841c9418e5825c17f33ad9c87c518115a45971f7f77e

  next()
}

// app
const app = express()
app.set('case sensitive routing', true)
app.set('strict routing', true)
app.set('views', 'views')
app.set('view engine', 'pug')
app.enable('trust proxy')

app.use(express.static('public'))
app.use(bodyParser.raw())
app.use(cookieSession({
  name   : 'session',
  keys   : [ sessionKey ],
  maxAge : ms('1 month'),
}))

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/webhook/github', checkGitHubSignature, (req, res) => {
  
  
  
  res.send('OK')
})

// server
const server = http.createServer()
server.on('request', app)

const port = process.env.PORT || 3000
server.listen(port, function() {
  console.log('Listening on port ' + port)
})
