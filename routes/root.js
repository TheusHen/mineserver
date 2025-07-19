'use strict'

module.exports = async function (fastify, opts) {
    fastify.get('/', async (request, reply) => {
        await new Promise(() => {})
    })
}
