// core
const http = require('http')
const crypto = require('crypto')

// npm
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const level = require('level')
const ms = require('ms')
const yid = require('yid')

// setup
const githubAppSecret = process.env.GITHUB_APP_SECRET
const sessionKey = process.env.SESSION_KEY
const db = level('.data/store.db', { valueEncoding: 'json' })

function checkGitHubSignature(req, res, next) {
  console.log('body:', req.body)
  
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

app.use(morgan('dev'))
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

app.get('/setup', (req, res) => {
  // https://github-webhook-inspector.glitch.me/setup?installation_id=1255053&setup_action=install
  const id = yid()
  db.put(`installation:${id}`, {
    id,
    type: 'installation',
    installation_id: req.query.installation_id,
    setup_action: req.query.setup_action,
  })
  res.render('setup')
})

app.get('/installations', (req, res, next) => {
  const installations = []
  const opts = {
    gt: 'installation:',
    lt: 'installation::',
  }
  db.createReadStream(opts)
    .on('data', function (data) {
      // console.log(data.key, '=', data.value)
      installations.push(data)
    })
    .on('error', function (err) {
      console.warn('err:', err)
      next(err)
    })
    .on('end', function () {
      // console.log('Stream ended')
    })
    .on('close', function () {
      // console.log('Stream closed')
      res.render('installations', { installations })
    })
  ;
})

app.post('/webhook/github', checkGitHubSignature, (req, res) => {
  console.log('body:', req.body)
  const data = JSON.parse(req.body)
  console.log('data:', data)
  res.send('OK')
})

// server
const server = http.createServer()
server.on('request', app)

const port = process.env.PORT || 3000
server.listen(port, function() {
  console.log('Listening on port ' + port)
})
