'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const sinon = require('sinon')
const axios = require('axios')
const { createOrUpdateSubdomain, removeSubdomain, cleanupUserAndDNS } = require('../../utils/cloudflare')

test('removeSubdomain deletes DNS record when found', async (t) => {
  // Mock axios responses
  const mockGetResponse = {
    data: {
      success: true,
      result: [
        { id: 'record-id-123', content: '192.168.1.1' }
      ]
    }
  }
  
  const mockDeleteResponse = {
    data: {
      success: true
    }
  }
  
  // Create stubs
  const getStub = sinon.stub(axios, 'get').resolves(mockGetResponse)
  const deleteStub = sinon.stub(axios, 'delete').resolves(mockDeleteResponse)
  
  // Set environment variables for test
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
  
  // Call the function
  await removeSubdomain('testuser')
  
  // Verify axios.get was called with correct parameters
  assert.equal(getStub.calledOnce, true)
  assert.equal(getStub.firstCall.args[0].includes('test-zone'), true)
  assert.equal(getStub.firstCall.args[1].params.name, 'testuser.mineflared.theushen.me')
  
  // Verify axios.delete was called with correct parameters
  assert.equal(deleteStub.calledOnce, true)
  assert.equal(deleteStub.firstCall.args[0].includes('record-id-123'), true)
  
  // Restore stubs
  getStub.restore()
  deleteStub.restore()
})

test('cleanupUserAndDNS removes DNS and deletes user from database', async (t) => {
  // Mock removeSubdomain
  const removeSubdomainStub = sinon.stub().resolves()
  
  // Mock MongoDB collection
  const mockCollection = {
    deleteOne: sinon.stub().resolves({ deletedCount: 1 })
  }
  
  // Mock MongoDB db
  const mockDb = {
    collection: sinon.stub().returns(mockCollection)
  }
  
  // Replace the actual function with our stub
  const originalRemoveSubdomain = require('../../utils/cloudflare').removeSubdomain
  require('../../utils/cloudflare').removeSubdomain = removeSubdomainStub
  
  // Call the function
  await cleanupUserAndDNS('testuser', mockDb)
  
  // Verify removeSubdomain was called
  assert.equal(removeSubdomainStub.calledOnce, true)
  assert.equal(removeSubdomainStub.firstCall.args[0], 'testuser')
  
  // Verify db.collection('users').deleteOne was called
  assert.equal(mockDb.collection.calledOnce, true)
  assert.equal(mockDb.collection.firstCall.args[0], 'users')
  assert.equal(mockCollection.deleteOne.calledOnce, true)
  assert.deepEqual(mockCollection.deleteOne.firstCall.args[0], { username: 'testuser' })
  
  // Restore the original function
  require('../../utils/cloudflare').removeSubdomain = originalRemoveSubdomain
})