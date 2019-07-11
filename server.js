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
const githubSignatureHeaderName = 'x-hub-signature'
const githubEventHeaderName = 'x-github-event'
const githubDeliveryHeaderName = 'x-github-delivery'
const githubAppSecret = process.env.GITHUB_APP_SECRET
const sessionKey = process.env.SESSION_KEY
const db = level('.data/store.db', { valueEncoding: 'json' })

// middleware
const bodyParserRaw = bodyParser.raw({ type: 'application/json' })

function checkGitHubSignature(req, res, next) {
  // console.log('typeof body:', typeof req.body)
  // console.log('body:', req.body.toString('utf8'))
  // console.log('body:', req.body)

  // check we have the required headers
  const id = req.headers[githubDeliveryHeaderName]
  // console.log('id:', id)
  if (!id) {
    next(new Error('No X-Github-Delivery found on request'))
    return
  }
  res.local.id = id

  const event = req.headers[githubEventHeaderName]
  // console.log('event:', event)
  if (!event) {
    next(new Error('No X-Github-Event found on request'))
    return
  }
  res.local.event = event

  const signature = req.headers[githubSignatureHeaderName]
  console.log('signature:', signature)
  if (!signature) {
    next(new Error('No X-Hub-Signature found on request'))
    return
  }

  const hmac = crypto.createHmac('sha1', githubAppSecret)
  hmac.update(req.body)
  const digest = hmac.digest('hex')
  console.log("digest=" + digest)
  if ( signature !== `sha1=${digest}` ) {
    next(new Error("GitHub Signature does not match what we calculated"))  
    return
  }
  
  // now set the body to be the data
  req.body = JSON.parse(req.body)

  next()
}

function githubSignatureError(err, req, res, next) {
  res.status(403).send('GitHub WebHook: Request body was not signed by or verification failed.\n')
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
    //gt: 'installation:',
    //lt: 'installation::',
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

app.post('/webhook/github', bodyParserRaw, checkGitHubSignature, githubSignatureError, (req, res) => {
  const id = yid()
  db.put(`webhook:${id}`, {
    id,
    githubId: res.locals.id,
    githubEvent: res.locals.event,
    data: req.body,
  }, err => {
    res.send('OK')
  })
})

// server
const server = http.createServer()
server.on('request', app)

const port = process.env.PORT || 3000
server.listen(port, function() {
  console.log('Listening on port ' + port)
})
