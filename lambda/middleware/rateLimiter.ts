import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { IRateLimiterMongoOptions, IRateLimiterRedisOptions, RateLimiterMongo, RateLimiterRedis } from 'rate-limiter-flexible'

export const rateLimiter = (option: IRateLimiterRedisOptions) => {

  const _rateLimiter = new RateLimiterRedis(option)

  return createMiddleware(async (c, next) => {
    const ip = c.req.raw.headers.get('x-forwarded-for')

    if (!ip) {
      return next()
    }
    try {
      await _rateLimiter.consume(ip)
    } catch (e: any) {
      throw new HTTPException(429, { message: `too many requests: ${e?.message || 'please wait for 1 min'}` })
    }
    await next()
  })
}