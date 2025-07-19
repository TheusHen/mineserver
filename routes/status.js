'use strict'

const axios = require('axios')

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID
const DOMAIN = 'mineflared.theushen.me'

module.exports = async function (fastify, opts) {
  fastify.get('/status', async (request, reply) => {
    try {
      const username = request.query.username || (request.body && request.body.username)
      if (!username) {
        return reply.code(400).send({ error: 'Parameter "username" is required' })
      }

      const db = fastify.mongo.client.db('mineflared')
      const user = await db.collection('users').findOne({ username })

      if (!user) {
        return reply.code(404).send({ status: 'offline', message: 'User not found' })
      }

      if (!user.ip) {
        return reply.code(404).send({ status: 'offline', message: 'User IP not registered' })
      }

      const subdomain = `${username}.${DOMAIN}`

      const response = await axios.get(
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

      if (!response.data.success) {
        return reply.code(500).send({ error: 'Error querying DNS in Cloudflare' })
      }

      const records = response.data.result

      if (records.length === 0) {
        return reply.code(404).send({ status: 'offline', message: 'DNS not found for user' })
      }

      const dnsIP = records[0].content
      const status = dnsIP === user.ip ? 'online' : 'offline'

      return reply.send({
        status,
        message: status === 'online' ? 'Server online and DNS configured correctly' : 'Server offline or DNS mismatch'
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
