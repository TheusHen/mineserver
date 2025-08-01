const request = require('supertest')
const express = require('express')
const userRoute = require('../routes/user')
const jwt = require('jsonwebtoken')

describe('GET /api/user', () => {
    let app, dbMock, user, token

    beforeAll(() => {
        app = express()
        app.locals = {}
        user = {
            username: 'testuser',
            github_token: 'ghp_xxx',
            ip: '1.2.3.4'
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
        process.env.JWT_SECRET = 'testsecret'
        userRoute(app)
        token = jwt.sign({ username: user.username }, process.env.JWT_SECRET)
    })

    it('should respond with 401 if token missing', async () => {
        const res = await request(app).get('/api/user')
        expect(res.statusCode).toBe(401)
    })

    it('should respond with 401 for invalid token', async () => {
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', 'Bearer invalidtoken')
        expect(res.statusCode).toBe(401)
    })

    it('should respond with 404 if user not found', async () => {
        const fakeToken = jwt.sign({ username: 'nouser' }, process.env.JWT_SECRET)
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', `Bearer ${fakeToken}`)
            .set('x-forwarded-for', user.ip)
        expect(res.statusCode).toBe(404)
    })

    it('should respond with 403 if IP does not match', async () => {
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', `Bearer ${token}`)
            .set('x-forwarded-for', '9.9.9.9')
        expect(res.statusCode).toBe(403)
    })

    it('should respond with user info if token and IP are valid', async () => {
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', `Bearer ${token}`)
            .set('x-forwarded-for', user.ip)
        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('username', user.username)
        expect(res.body).toHaveProperty('github_token', user.github_token)
        expect(res.body).toHaveProperty('ip', user.ip)
    })
})