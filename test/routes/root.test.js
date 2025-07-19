'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../helper')

test('root route returns 403', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'GET',
    url: '/'
  })

  assert.equal(response.statusCode, 403)
  assert.deepEqual(JSON.parse(response.payload), {
    error: 'Forbidden',
    message: 'This route is not available.',
    statusCode: 403
  })
})