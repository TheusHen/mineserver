'use strict'

require('dotenv').config()
const path = require('node:path')
const AutoLoad = require('@fastify/autoload')
const { MongoClient } = require('mongodb')

const options = {}

const { startGithubCleanupJob } = require('./jobs/github-cleanup')

module.exports = async function (fastify, opts) {
  const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017')
  await mongoClient.connect()

  fastify.decorate('mongo', { client: mongoClient })

  fastify.addHook('onReady', async () => {
    if (fastify.mongo && fastify.mongo.client) {
      const db = fastify.mongo.client.db(process.env.MONGODB_DATABASE_NAME)
      startGithubCleanupJob(db)
    } else {
      fastify.log.warn('MongoDB not initialized, cleanup job will not start.')
    }
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })

  fastify.addHook('onClose', async (instance) => {
    if (instance.mongo && instance.mongo.client) {
      await instance.mongo.client.close()
    }
  })
}

module.exports.options = options
