'use strict'

const jwt = require('jsonwebtoken');

module.exports = async function (fastify, opts) {
    fastify.get('/api/user', async (request, reply) => {
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

        const db = fastify.mongo.client.db('mineflared');
        const user = await db.collection('users').findOne({ username: payload.username });
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        return reply.send({
            username: user.username,
            github_token: user.github_token || '',
            ip: user.ip || ''
        });
    });
}
