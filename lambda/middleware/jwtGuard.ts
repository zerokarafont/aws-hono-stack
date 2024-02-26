import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { config } from '../config'

export const jwtGuard = createMiddleware(async (c, next) => {
  const token = c.req.raw.headers.get('Authorization')
  if (!token) {
    throw new HTTPException(401, { message: 'no token' })
  }
  const decodedPayload = await verify(token.replace('Bearer ', ''), config.JWT_SECRET!!)
  if (!decodedPayload) {
    throw new HTTPException(401, { message: 'token verify failed' })
  }
  c.set('jwtPayload', decodedPayload)
  await next()
})