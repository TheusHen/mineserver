const request = require('supertest')
const express = require('express')
const authRoute = require('../routes/auth')
const jwt = require('jsonwebtoken')
const axios = require('axios')

jest.mock('axios')
jest.mock('../utils/cloudflare', () => ({
    createOrUpdateSubdomain: jest.fn().mockResolvedValue()
}))

describe('Auth routes', () => {
    let app, dbMock

    beforeAll(() => {
        app = express()
        app.locals = {}
        dbMock = {
            collection: jest.fn().mockReturnValue({
                updateOne: jest.fn().mockResolvedValue({}),
            })
        }
        app.locals.mongo = { db: () => dbMock }
        process.env.GITHUB_CLIENT_ID = 'cid'
        process.env.GITHUB_CLIENT_SECRET = 'csecret'
        process.env.GITHUB_OAUTH_URL = 'https://github.com/login/oauth'
        process.env.GITHUB_API_URL = 'https://api.github.com'
        process.env.JWT_SECRET = 'testsecret'
        process.env.JWT_EXPIRATION = '1d'
        process.env.DOMAIN = 'mineflared.theushen.me'
        process.env.SERVER_URL = 'http://localhost:3000'
        axios.post.mockResolvedValue({ data: { access_token