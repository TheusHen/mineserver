'use strict'

const cors = require('../middlewares/cors')
const axios = require('axios')
const jwt = require('jsonwebtoken')
const { createOrUpdateSubdomain } = require('../utils/cloudflare')

// Axios instance with timeout
const axiosGH = axios.create({ timeout: 10000 })

async function getNewGithubToken(code) {
    const tokenRes = await axiosGH.post(`${process.env.GITHUB_OAUTH_URL}/access_token`, {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
    }, {
        headers: { Accept: 'application/json' }
    })
    return tokenRes.data.access_token
}

module.exports = function (app) {
    app.get('/auth/github/login', cors(), (req, res) => {
        const { callback, ip } = req.query
        if (!ip || !callback) return res.status(400).send('Missing IP or callback')
        const clientId = process.env.GITHUB_CLIENT_ID

        const baseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`
        const redirectUri = `${baseUrl}/auth/github/callback?callback=${encodeURIComponent(callback)}&ip=${encodeURIComponent(ip)}`
        const githubAuthUrl = `${process.env.GITHUB_OAUTH_URL}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
        return res.redirect(githubAuthUrl)
    })

    app.get('/auth/github/callback', cors(), async (req, res) => {
        const { code, callback, ip } = req.query
        if (!code || !ip || !callback) return res.status(400).send('Missing code, IP or callback')

        let access_token
        try {
            console.log('[auth/github/callback] Getting new GitHub token...')
            access_token = await getNewGithubToken(code)
            console.log('[auth/github/callback] Got token:', Boolean(access_token))
        } catch (err) {
            console.error('Failed to get GitHub token:', err)
            return res.status(500).send('Failed to get GitHub token')
        }

        let userRes
        try {
            console.log('[auth/github/callback] Getting user from GitHub...')
            userRes = await axiosGH.get(`${process.env.GITHUB_API_URL}/user`, {
                headers: { Authorization: `Bearer ${access_token}` }
            })
            console.log('[auth/github/callback] User:', userRes.data.login)
        } catch (err) {
            console.error('Failed to get GitHub user:', err)
            return res.status(500).send('Failed to get GitHub user')
        }

        const { login: username, id: githubId } = userRes.data
        const jwtToken = jwt.sign({ username, githubId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION })

        const db = app.locals.mongo.db(process.env.MONGODB_DATABASE_NAME)
        try {
            console.log('[auth/github/callback] Updating user in MongoDB...')
            await db.collection('users').updateOne(
                { githubId },
                { $set: { username, githubId, token: jwtToken, ip, lastLogin: new Date(), github_token: access_token } },
                { upsert: true }
            )
            console.log('[auth/github/callback] Creating/updating subdomain...')
            await createOrUpdateSubdomain(username, ip, db)
        } catch (err) {
            console.error('Error creating subdomain or updating Mongo:', err)
        }

        return res.redirect(`${callback}?token=${jwtToken}`)
    })
}