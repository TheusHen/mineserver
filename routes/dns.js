'use strict'

const cors = require('../middlewares/cors')
const authenticate = require('../middlewares/auth')
const { createOrUpdateDNS } = require('../utils/cloudflare')

// Mongo timeout helper
function withTimeout(promise, ms, msg) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
    ])
}

module.exports = function (app) {
    app.post('/create', cors(), authenticate, async (req, res) => {
        const { ip, type, port } = req.body
        const username = req.jwtPayload.username

        if (!username || !ip || !type) {
            return res.status(400).send({ error: 'Username, IP ou tipo faltando' })
        }

        try {
            const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
            await withTimeout(
                createOrUpdateDNS(username, ip, type, port, db),
                20000,
                '[dns/create] Timeout ao criar/atualizar DNS'
            )
            return res.send({ 
                success: true, 
                subdomain: `${username}.${process.env.DOMAIN}`,
                connection_info: type === 'java' 
                    ? {
                        server_address: `${username}.${process.env.DOMAIN}`,
                        note: "For Minecraft Java Edition, just use the server address above. The port will be automatically detected via SRV record."
                      }
                    : {
                        server_address: `${username}.${process.env.DOMAIN}`,
                        port: parseInt(port, 10) || (type === 'bedrock' ? 19132 : 25565),
                        full_address: `${username}.${process.env.DOMAIN}:${parseInt(port, 10) || (type === 'bedrock' ? 19132 : 25565)}`,
                        note: "For Minecraft Bedrock Edition, use the full address with port, or enter server address and port separately."
                      }
            })
        } catch (err) {
            return res.status(500).send({ error: err.message })
        }
    })
}