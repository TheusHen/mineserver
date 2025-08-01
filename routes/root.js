'use strict'

const cors = require('../middlewares/cors')

module.exports = function (app) {
    app.get('/', cors({ public: true }), (req, res) => {
        res.status(204).end();
    })
}