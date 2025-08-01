'use strict'

const cors = require('../middlewares/cors')
const authenticate = require('../middlewares/auth')
const ipMatch = require('../middlewares/ip-match')

module.exports = function (app) {
    app.get('/api/user', cors(), authenticate, async (req, res, next) => {
        const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
        const user = await db.collection('users').findOne({ username: req.jwtPayload.username })
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