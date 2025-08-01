const request = require('supertest')
const express = require('express')
const dnsRoute = require('../routes/dns')
const jwt = require('jsonwebtoken')

jest.mock('../utils/cloudflare', () => ({
    createOrUpdateSubdomain: jest.fn().mockResolvedValue()
}))

describe('POST /create', () => {
    let app, dbMock, token

    beforeAll(() => {
        app = express()
        app.use(express.json())
        app.locals = {}
        dbMock = {}
        app.locals.mongo = { db: () => dbMock }
        process.env.JWT_SECRET = 'testsecret'
        process.env.DOMAIN = 'mineflared.theushen.me'
        dnsRoute(app)
        token = jwt.sign({ username: 'testuser' }, process.env.JWT_SECRET)
    })

    it('should require token', async () => {
        const res = await request(app)
            .post('/create')
            .send({ ip: '1.2.3.4' })
        expect(res.statusCode).toBe(401)
    })

    it('should reject invalid token', async () => {
        const res = await request(app)
            .post('/create')
            .set('Authorization', 'Bearer invalidtoken')
            .send({ ip: '1.2.3.4' })
        expect(res.statusCode).toBe(401)
    })

    it('should require username and IP', async () => {
        const res = await request(app)
            .post('/create')
            .set('Authorization', `Bearer ${token}`)
            .send({})
        expect(res.statusCode).toBe(400)
    })

    it('should create subdomain if valid', async () => {
        const res = await request(app)
            .post('/create')
            .set('Authorization', `Bearer ${token}`)
            .send({ ip: '1.2.3.4' })
        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('success', true)
        expect(res.body).toHaveProperty('subdomain')
    })

    it('should handle subdomain creation errors', async () => {
        const { createOrUpdateSubdomain } = require('../utils/cloudflare')
        createOrUpdateSubdomain.mockRejectedValueOnce(new Error('fail'))
        const res = await request(app)
            .post('/create')
            .set('Authorization', `Bearer ${token}`)
            .send({ ip: '1.2.3.4' })
        expect(res.statusCode).toBe(500)
    })
})