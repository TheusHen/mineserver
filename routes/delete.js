'use strict'

const cors = require('../middlewares/cors')
const authenticate = require('../middlewares/auth')
const ipMatch = require('../middlewares/ip-match')
const { removeSubdomain } = require('../utils/cloudflare')

module.exports = function (app) {
    app.delete('/delete', cors(), authenticate, async (req, res, next) => {
        const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
        const user = await db.collection('users').findOne({ username: req.jwtPayload.username })
        if (!user) return res.status(404).send({ error: 'User not found' })
        req.user = user
        next()
    }, ipMatch, async (req, res) => {
        const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
        const username = req.user.username
        try {
            await removeSubdomain(username)
            await db.collection('users').deleteOne({ username })
            return res.send({ success: true, message: `All data for ${username} has been deleted.` })
        } catch (err) {
            return res.status(500).send({ error: err.message })
        }
    })
}