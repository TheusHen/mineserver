const request = require('supertest')
const express = require('express')
const statusRoute = require('../routes/status')
const axios = require('axios')

jest.mock('axios')

describe('GET /status', () => {
    let app, dbMock, user

    beforeAll(() => {
        app = express()
        app.locals = {}
        user = {
            username: 'testuser',
            ip: '5.6.7.8'
        }
        dbMock = {
            collection: jest.fn().mockReturnValue({
                findOne: jest.fn().mockImplementation(({ username }) => {
                    if (username === user.username) return Promise.resolve(user)
                    return Promise.resolve(null)
                })
            })
        }
        app.locals.mongo = { db: () => dbMock }
        process.env.DOMAIN = 'mineflared.theushen.me'
        process.env.CLOUDFLARE_API_TOKEN = 'dummy'
        process.env.CLOUDFLARE_ZONE_ID = 'zoneid'
        statusRoute(app)
    })

    it('should reject requests from non-official origins', async () => {
        const res = await request(app)
            .get('/status?username=testuser')
            .set('Origin', 'https://notallowed.com')
        expect(res.statusCode).toBe(403)
    })

    it('should require username', async () => {
        const res = await request(app)
            .get('/status')
            .set('Origin', 'https://mineflared.theushen.me')
        expect(res.body.error).toMatch(/username/i)
        expect(res.statusCode).toBe(400)
    })

    it('should return 404 if user not found', async () => {
        const res = await request(app)
            .get('/status?username=nouser')
            .set('Origin', 'https://mineflared.theushen.me')
        expect(res.body.status).toBe('offline')
        expect(res.body.message).toMatch(/not found/i)
        expect(res.statusCode).toBe(404)
    })

    it('should return 404 if user IP is not registered', async () => {
        dbMock.collection = jest.fn().mockReturnValue({
            findOne: jest.fn().mockImplementation(({ username }) => {
                if (username === user.username) return Promise.resolve({ ...user, ip: undefined })
                return Promise.resolve(null)
            })
        })
        app.locals.mongo = { db: () => dbMock }
        const res = await request(app)
            .get('/status?username=testuser')
            .set('Origin', 'https://mineflared.theushen.me')
        expect(res.body.status).toBe('offline')
        expect(res.body.message).toMatch(/IP not registered/)
        expect(res.statusCode).toBe(404)
    })

    it('should return 404 if no DNS record', async () => {
        dbMock.collection = jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(user)
        })
        app.locals.mongo = { db: () => dbMock }
        axios.get.mockResolvedValue({
            data: { success: true, result: [] }
        })
        const res = await request(app)
            .get('/status?username=testuser')
            .set('Origin', 'https://mineflared.theushen.me')
        expect(res.body.status).toBe('offline')
        expect(res.body.message).toMatch(/DNS not found/)
        expect(res.statusCode).toBe(404)
    })

    it('should return online if DNS matches user IP', async () => {
        axios.get.mockResolvedValue({
            data: { success: true, result: [{ content: user.ip }] }
        })
        const res = await request(app)
            .get('/status?username=testuser')
            .set('Origin', 'https://mineflared.theushen.me')
        expect(res.body.status).toBe('online')
        expect(res.body.message).toMatch(/online/)
        expect(res.statusCode).toBe(200)
    })

    it('should return offline if DNS does not match user IP', async () => {
        axios.get.mockResolvedValue({
            data: { success: true, result: [{ content: '1.1.1.1' }] }
        })
        const res = await request(app)
            .get('/status?username=testuser')
            .set('Origin', 'https://mineflared.theushen.me')
        expect(res.body.status).toBe('offline')
        expect(res.body.message).toMatch(/offline|mismatch/)
        expect(res.statusCode).toBe(200)
    })

    it('should return 500 on Cloudflare error', async () => {
        axios.get.mockResolvedValue({
            data: { success: false }
        })
        const res = await request(app)
            .get('/status?username=testuser')
            .set('Origin', 'https://mineflared.theushen.me')
        expect(res.statusCode).toBe(500)
    })
})