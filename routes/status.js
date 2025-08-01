'use strict'

const cors = require('../middlewares/cors')
const axios = require('axios')

// Axios CF instance with timeout
const axiosCF = axios.create({ timeout: 10000 })

const DOMAIN = process.env.DOMAIN
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID

// Mongo timeout helper
function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
  ])
}

module.exports = function (app) {
  app.get('/status', cors(), async (req, res) => {
    const origin = req.headers.origin
    if (!origin || origin !== 'https://mineflared.theushen.me') {
      return res.status(403).send({ error: 'Forbidden' })
    }

    const username = req.query.username || (req.body && req.body.username)
    if (!username) {
      return res.status(400).send({ error: 'Parameter "username" is required' })
    }

    const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
    let user
    try {
      user = await withTimeout(
          db.collection('users').findOne({ username }),
          10000,
          '[status] MongoDB timeout'
      )
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }

    if (!user) return res.status(404).send({ status: 'offline', message: 'User not found' })
    if (!user.ip) return res.status(404).send({ status: 'offline', message: 'User IP not registered' })

    const subdomain = `${username}.${DOMAIN}`

    let response
    try {
      response = await axiosCF.get(
          `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
          {
            headers: {
              Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            params: {
              type: 'A',
              name: subdomain
            }
          }
      )
    } catch (err) {
      return res.status(500).send({ error: 'Error querying DNS in Cloudflare: ' + err.message })
    }

    if (!response.data.success) {
      return res.status(500).send({ error: 'Error querying DNS in Cloudflare' })
    }

    const records = response.data.result

    if (records.length === 0) {
      return res.status(404).send({ status: 'offline', message: 'DNS not found for user' })
    }

    const dnsIP = records[0].content
    const status = dnsIP === user.ip ? 'online' : 'offline'

    return res.send({
      status,
      message: status === 'online' ? 'Server online and DNS configured correctly' : 'Server offline or DNS mismatch'
    })
  })
}