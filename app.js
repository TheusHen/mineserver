'use strict'

require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const { MongoClient } = require('mongodb')
const { startGithubCleanupJob } = require('./jobs/github-cleanup')

const app = express()
app.use(bodyParser.json())

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
  } else {
    next()
  }
})

const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017', {
  tls: true,
  minTLSVersion: 'TLS1_2',
})

async function start() {
  try {
    await mongoClient.connect()
    app.locals.mongo = mongoClient
    const db = mongoClient.db(process.env.MONGODB_DATABASE_NAME)
    startGithubCleanupJob(db)
    console.log('MongoDB connected and cleanup job started.')

    require('./routes/auth')(app)
    require('./routes/delete')(app)
    require('./routes/dns')(app)
    require('./routes/status')(app)
    require('./routes/user')(app)
    require('./routes/root')(app)

    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT}`)
    })

  } catch (err) {
    console.error('Error connecting to MongoDB:', err)
    process.exit(1)
  }
}

start()

process.on('SIGINT', async () => {
  if (mongoClient) await mongoClient.close()
  process.exit(0)
})