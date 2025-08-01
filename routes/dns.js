'use strict'

const cors = require('../middlewares/cors')
const authenticate = require('../middlewares/auth')
const { createOrUpdateSubdomain } = require('../utils/cloudflare')

// Mongo timeout helper
function withTimeout(promise, ms, msg) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
    ])
}

module.exports = function (app) {
    app.post('/create', cors(), authenticate, async (req, res) => {
        const ip = req.body.ip
        const username = req.jwtPayload.username

        if (!username || !ip) {
            return res.status(400).send({ error: 'Username or IP missing' })
        }

        try {
            const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
            await withTimeout(
                createOrUpdateSubdomain(username, ip, db),
                10000,
                '[dns/create] Timeout ao criar/atualizar subdomínio'
            )
            return res.send({ success: true, subdomain: `${username}.${process.env.DOMAIN}` })
        } catch (err) {
            return res.status(500).send({ error: err.message })
        }
    })
}