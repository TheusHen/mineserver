'use strict'

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { createOrUpdateSubdomain, cleanupUserAndDNS } = require('../utils/cloudflare');

async function getNewGithubToken(code) {
    const tokenRes = await axios.post(`${process.env.GITHUB_OAUTH_URL}/access_token`, {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
    }, {
        headers: { Accept: 'application/json' }
    });
    return tokenRes.data.access_token;
}

module.exports = async function (fastify, opts) {
    fastify.get('/auth/github/login', async (request, reply) => {
        const { callback, ip } = request.query;
        if (!ip || !callback) return reply.code(400).send('Missing IP or callback');
        const clientId = process.env.GITHUB_CLIENT_ID;

        const baseUrl = process.env.SERVER_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/auth/github/callback?callback=${encodeURIComponent(callback)}&ip=${encodeURIComponent(ip)}`;
        const githubAuthUrl = `${process.env.GITHUB_OAUTH_URL}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        return reply.redirect(githubAuthUrl);
    });

    fastify.get('/auth/github/callback', async (request, reply) => {
        const { code, callback, ip } = request.query;
        if (!code || !ip || !callback) return reply.code(400).send('Missing code, IP or callback');

        let access_token;
        try {
            access_token = await getNewGithubToken(code);
        } catch (err) {
            fastify.log.error('Failed to get GitHub token:', err);
            return reply.code(500).send('Failed to get GitHub token');
        }

        let userRes;
        try {
            userRes = await axios.get(`${process.env.GITHUB_API_URL}/user`, {
                headers: { Authorization: `Bearer ${access_token}` }
            });
        } catch (err) {
            fastify.log.error('Failed to get GitHub user:', err);
            return reply.code(500).send('Failed to get GitHub user');
        }

        const { login: username, id: githubId } = userRes.data;
        const jwtToken = jwt.sign({ username, githubId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });

        const db = fastify.mongo.client.db(process.env.MONGODB_DATABASE_NAME);
        try {
            await db.collection('users').updateOne(
                { githubId },
                { $set: { username, githubId, token: jwtToken, ip, lastLogin: new Date(), github_token: access_token } },
                { upsert: true }
            );
            await createOrUpdateSubdomain(username, ip, db);
        } catch (err) {
            fastify.log.error('Error creating subdomain:', err);
        }

        return reply.redirect(`${callback}?token=${jwtToken}`);
    });
}
