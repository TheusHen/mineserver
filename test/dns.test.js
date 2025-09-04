const request = require('supertest')
const express = require('express')
const dnsRoute = require('../routes/dns')
const jwt = require('jsonwebtoken')

jest.mock('../utils/cloudflare', () => ({
    createOrUpdateDNS: jest.fn().mockResolvedValue()
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
            .send({ ip: '1.2.3.4', type: 'java', port: 25565 })
        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('success', true)
        expect(res.body).toHaveProperty('subdomain')
        expect(res.body).toHaveProperty('connection_info')
        expect(res.body.connection_info).toHaveProperty('server_address')
    })

    it('should provide correct connection info for Java servers', async () => {
        const res = await request(app)
            .post('/create')
            .set('Authorization', `Bearer ${token}`)
            .send({ ip: '1.2.3.4', type: 'java', port: 25566 })
        expect(res.statusCode).toBe(200)
        expect(res.body.connection_info.server_address).toBe('testuser.mineflared.theushen.me')
        expect(res.body.connection_info.note).toContain('SRV record')
    })

    it('should provide correct connection info for Bedrock servers', async () => {
        const res = await request(app)
            .post('/create')
            .set('Authorization', `Bearer ${token}`)
            .send({ ip: '1.2.3.4', type: 'bedrock', port: 19132 })
        expect(res.statusCode).toBe(200)
        expect(res.body.connection_info.server_address).toBe('testuser.mineflared.theushen.me')
        expect(res.body.connection_info.port).toBe(19132)
        expect(res.body.connection_info.full_address).toBe('testuser.mineflared.theushen.me:19132')
        expect(res.body.connection_info.note).toContain('Bedrock Edition')
    })

    it('should handle subdomain creation errors', async () => {
        const { createOrUpdateDNS } = require('../utils/cloudflare')
        createOrUpdateDNS.mockRejectedValueOnce(new Error('fail'))
        const res = await request(app)
            .post('/create')
            .set('Authorization', `Bearer ${token}`)
            .send({ ip: '1.2.3.4', type: 'java' })
        expect(res.statusCode).toBe(500)
    })
})