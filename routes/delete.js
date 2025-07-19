'use strict'

const jwt = require('jsonwebtoken');
const { removeSubdomain } = require('../utils/cloudflare');

module.exports = async function (fastify, opts) {
    fastify.delete('/delete', async (request, reply) => {
        const authHeader = request.headers.authorization;

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
        if (!username) {
            return reply.code(400).send({ error: 'Username missing' });
        }

        try {
            const db = fastify.mongo.client.db('mineflared');
            await removeSubdomain(username);
            await db.collection('users').deleteOne({ username });
            return reply.send({ success: true, message: `All data for ${username} has been deleted.` });
        } catch (err) {
            return reply.code(500).send({ error: err.message });
        }
    });
}
