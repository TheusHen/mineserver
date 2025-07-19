'use strict'

const jwt = require('jsonwebtoken');
const { createOrUpdateSubdomain } = require('../utils/cloudflare');

module.exports = async function (fastify, opts) {
    fastify.post('/create', async (request, reply) => {
        const authHeader = request.headers.authorization;
        const ip = request.body.ip;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Token missing' });
        }

        const token = authHeader.split(' ')[1];

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return reply.code(401).send({ error: 'Invalid token' });
        }

        const username = payload.username;
        if (!username || !ip) {
            return reply.code(400).send({ error: 'Username or IP missing' });
        }

        try {
            const db = fastify.mongo.client.db(process.env.MONGODB_DATABASE_NAME);
            await createOrUpdateSubdomain(username, ip, db);
            return reply.send({ success: true, subdomain: `${username}.${process.env.DOMAIN}` });
        } catch (err) {
            return reply.code(500).send({ error: err.message });
        }
    });
}
