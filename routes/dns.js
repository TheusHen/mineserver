'use strict'

const cors = require('../middlewares/cors')
const authenticate = require('../middlewares/auth')
const { createOrUpdateSubdomain } = require('../utils/cloudflare')

module.exports = function (app) {
    app.post('/create', cors(), authenticate, async (req, res) => {
        const ip = req.body.ip
        const username = req.jwtPayload.username

        if (!username || !ip) {
            return res.status(400).send({ error: 'Username or IP missing' })
        }

        try {
            const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
            await createOrUpdateSubdomain(username, ip, db)
            return res.send({ success: true, subdomain: `${username}.${process.env.DOMAIN}` })
        } catch (err) {
            return res.status(500).send({ error: err.message })
        }
    })
}