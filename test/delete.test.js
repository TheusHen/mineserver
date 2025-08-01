const request = require('supertest')
const express = require('express')
const deleteRoute = require('../routes/delete')
const jwt = require('jsonwebtoken')

jest.mock('../utils/cloudflare', () => ({
    removeSubdomain: jest.fn().mockResolvedValue()
}))

describe('DELETE /delete', () => {
    let app, dbMock, user, token

    beforeAll(() => {
        app = express()
        app.locals = {}
        user = {
            username: 'testuser',
            ip: '1.1.1.1'
        }
        dbMock = {
            collection: jest.fn().mockReturnValue({
                findOne: jest.fn().mockImplementation(({ username }) => {
                    if (username === user.username) return Promise.resolve(user)
                    return Promise.resolve(null)
                }),
                deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
            })
        }
        app.locals.mongo = { db: () => dbMock }
        process.env.JWT_SECRET = 'testsecret'
        deleteRoute(app)
        token = jwt.sign({ username: user.username }, process.env.JWT_SECRET)
    })

    it('should require token', async () => {
        const res = await request(app).delete('/delete')
        expect(res.statusCode).toBe(401)
    })

    it('should reject invalid token', async () => {
        const res = await request(app)
            .delete('/delete')
            .set('Authorization', 'Bearer invalidtoken')
        expect(res.statusCode).toBe(401)
    })

    it('should respond 404 if user not found', async () => {
        const fakeToken = jwt.sign({ username: 'nouser' }, process.env.JWT_SECRET)
        const res = await request(app)
            .delete('/delete')
            .set('Authorization', `Bearer ${fakeToken}`)
            .set('x-forwarded-for', user.ip)
        expect(res.statusCode).toBe(404)
    })

    it('should forbid if IP does not match', async () => {
        const res = await request(app)
            .delete('/delete')
            .set('Authorization', `Bearer ${token}`)
            .set('x-forwarded-for', '9.9.9.9')
        expect(res.statusCode).toBe(403)
    })

    it('should delete user and subdomain', async () => {
        const res = await request(app)
            .delete('/delete')
            .set('Authorization', `Bearer ${token}`)
            .set('x-forwarded-for', user.ip)
        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('success', true)
        expect(res.body).toHaveProperty('message')
    })

    it('should handle errors in subdomain removal', async () => {
        const { removeSubdomain } = require('../utils/cloudflare')
        removeSubdomain.mockRejectedValueOnce(new Error('fail'))
        const res = await request(app)
            .delete('/delete')
            .set('Authorization', `Bearer ${token}`)
            .set('x-forwarded-for', user.ip)
        expect(res.statusCode).toBe(500)
    })
})