'use strict'

const cors = require('../middlewares/cors')
const authenticate = require('../middlewares/auth')
const ipMatch = require('../middlewares/ip-match')

// Mongo timeout helper
function withTimeout(promise, ms, msg) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
    ])
}

module.exports = function (app) {
    app.get('/api/user', cors(), authenticate, async (req, res, next) => {
        const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
        let user
        try {
            console.log('[api/user] Looking up user in Mongo...')
            user = await withTimeout(
                db.collection('users').findOne({ username: req.jwtPayload.username }),
                10000,
                '[api/user] MongoDB timeout'
            )
        } catch (err) {
            console.error(err)
            return res.status(500).send({ error: err.message })
        }
        if (!user) return res.status(404).send({ error: 'User not found' })
        req.user = user
        next()
    }, ipMatch, async (req, res) => {
        const user = req.user
        return res.send({
            username: user.username,
            github_token: user.github_token || '',
            ip: user.ip || ''
        })
    })
}