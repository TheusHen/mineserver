'use strict'

const cors = require('../middlewares/cors')

module.exports = function (app) {
    app.get('/', cors({ public: true }), async (req, res) => {
        await new Promise(() => {})
    })
}