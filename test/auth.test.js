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
        authRoute(app)
    })

    describe('GET /auth/github/login', () => {
        it('should require IP and callback', async () => {
            const res = await request(app).get('/auth/github/login')
            expect(res.statusCode).toBe(400)
        })

        it('should redirect to github', async () => {
            const res = await request(app).get('/auth/github/login?ip=1.1.1.1&callback=http://cb.com')
            expect(res.statusCode).toBe(302)
            expect(res.headers.location).toContain('github.com/login/oauth/authorize')
        })
    })

    describe('GET /auth/github/callback', () => {
        it('should require code, ip, and callback', async () => {
            const res = await request(app).get('/auth/github/callback')
            expect(res.statusCode).toBe(400)
        })

        it('should error if github token fetch fails', async () => {
            axios.post.mockRejectedValueOnce(new Error('fail'))
            const res = await request(app)
                .get('/auth/github/callback?code=x&ip=1.1.1.1&callback=http://cb.com')
            expect(res.statusCode).toBe(500)
        })

        it('should error if github user fetch fails', async () => {
            axios.post.mockResolvedValueOnce({ data: { access_token: 'tok' } })
            axios.get.mockRejectedValueOnce(new Error('fail'))
            const res = await request(app)
                .get('/auth/github/callback?code=x&ip=1.1.1.1&callback=http://cb.com')
            expect(res.statusCode).toBe(500)
        })

        it('should update user, create subdomain and redirect with token', async () => {
            axios.post.mockResolvedValueOnce({ data: { access_token: 'tok' } })
            axios.get.mockResolvedValueOnce({ data: { login: 'testuser', id: 42 } })
            const res = await request(app)
                .get('/auth/github/callback?code=x&ip=1.1.1.1&callback=http://cb.com')
            expect(res.statusCode).toBe(302)
            expect(res.headers.location).toContain('token=')
        })
    })
})