const http = require('http')
const context = require('./context')
const request = require('./request')
const response = require('./response')
const EventEmmiter = require('events')

class Application extends EventEmmiter {

  // 应用间独立
  constructor() {
    super()
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)

    this.middlewares = []
  }

  use(middleware) {
    this.middlewares.push(middleware)
  }

  createContext(req, res) {
    const ctx = Object.create(this.context)
    const request = Object.create(this.request)
    const response = Object.create(this.response)
    ctx.request = request
    ctx.request.req = ctx.req = req
    ctx.response = response
    ctx.response.res = ctx.res = res
    return ctx
  }

  compose(ctx) {
    let index = -1
    const dispatch = (i) => {
      if (index >= i) {
        return Promise.reject('next() called multiple times')
      }
      index = i
      if (this.middlewares.length == i) return Promise.resolve()
      let middleware = this.middlewares[i]
      try {
        return Promise.resolve(middleware(ctx, () => dispatch(i + 1)))
      } catch (e) {
        return Promise.reject(e)
      }
    }
    return dispatch(0)
  }

  handleRequest = (req, res) => {
    let ctx = this.createContext(req, res)
    res.statusCode = 404

    this.compose(ctx).then(() => {
      const body = ctx.body
      if (body) {
        res.end(body)
      } else {
        res.end('NOT FOUND')
      }
    }).catch((e) => {
      this.emit('error', e)
    })

  }

  listen() {
    let server = http.createServer(this.handleRequest)
    server.listen(...arguments)
  }
}

module.exports = Application

// 1. koa 功能丰富的 ctx
// 2. 内部提供了一个中间件流程（洋葱模型）
// 3. 更好的错误处理
