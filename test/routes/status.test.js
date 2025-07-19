'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../helper')
const sinon = require('sinon')
const axios = require('axios')

test('status route returns 400 when username is missing', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'GET',
    url: '/status'
  })

  assert.equal(response.statusCode, 400)
  assert.deepEqual(JSON.parse(response.payload), {
    error: 'Parameter "username" is required'
  })
})

test('status route returns 404 when user is not found', async (t) => {
  const app = await build(t)
  
  // Mock MongoDB findOne to return null (user not found)
  const mockCollection = {
    findOne: sinon.stub().resolves(null)
  }
  
  const mockDb = {
    collection: sinon.stub().returns(mockCollection)
  }
  
  app.mongo = {
    client: {
      db: sinon.stub().returns(mockDb)
    }
  }

  const response = await app.inject({
    method: 'GET',
    url: '/status?username=testuser'
  })

  assert.equal(response.statusCode, 404)
  assert.deepEqual(JSON.parse(response.payload), {
    status: 'offline',
    message: 'User not found'
  })
})