'use strict'

const jwt = require('jsonwebtoken')

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ error: 'Token missing' })
    }
    const token = authHeader.split(' ')[1]
    try {
        req.jwtPayload = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch (err) {
        return res.status(401).send({ error: 'Invalid token' })
    }
}

module.exports = authenticate