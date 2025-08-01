'use strict'

const ALLOWED_ORIGINS = [
    'https://mineflared.theushen.me'
]

function cors(options = {}) {
    return function (req, res, next) {
        const origin = req.headers.origin
        if (ALLOWED_ORIGINS.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Vary', 'Origin')
            res.setHeader('Access-Control-Allow-Credentials', 'true')
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
        } else if (options.public) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
        }
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204)
        }
        next()
    }
}

module.exports = cors