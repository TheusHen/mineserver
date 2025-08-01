'use strict'

async function ipMatch(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
    if (!req.user?.ip || req.user.ip !== ip) {
        return res.status(403).send({ error: 'Access allowed only from authorized IP' })
    }
    next()
}

module.exports = ipMatch