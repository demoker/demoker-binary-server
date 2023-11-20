const frameworks = require('./controllers/frameworks')
const Router = require('koa-router')
const router = new Router


router
    .get('/frameworks', frameworks.download)
    .get('/frameworks/:names', frameworks.show)
    .get('/frameworks/:xcode_version/:configuration/:name/:version', frameworks.show)
    .del('/frameworks/:xcode_version/:configuration/:name/:version', frameworks.destroy)
    .get('/frameworks/:xcode_version/:configuration/:name/:version/(.+)', frameworks.download)
    .post('/frameworks', frameworks.create)

module.exports = router
