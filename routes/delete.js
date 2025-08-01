'use strict'

const cors = require('../middlewares/cors')
const authenticate = require('../middlewares/auth')
const ipMatch = require('../middlewares/ip-match')
const { removeSubdomain } = require('../utils/cloudflare')

// Mongo timeout helper
function withTimeout(promise, ms, msg) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
    ])
}

module.exports = function (app) {
    app.delete('/delete', cors(), authenticate, async (req, res, next) => {
        const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
        let user
        try {
            user = await withTimeout(
                db.collection('users').findOne({ username: req.jwtPayload.username }),
                10000,
                '[delete] MongoDB timeout'
            )
        } catch (err) {
            return res.status(500).send({ error: err.message })
        }
        if (!user) return res.status(404).send({ error: 'User not found' })
        req.user = user
        next()
    }, ipMatch, async (req, res) => {
        const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
        const username = req.user.username
        try {
            await withTimeout(
                removeSubdomain(username),
                10000,
                '[delete] Timeout ao remover subdomínio'
            )
            await withTimeout(
                db.collection('users').deleteOne({ username }),
                10000,
                '[delete] Timeout ao remover user'
            )
            return res.send({ success: true, message: `All data for ${username} has been deleted.` })
        } catch (err) {
            return res.status(500).send({ error: err.message })
        }
    })
}