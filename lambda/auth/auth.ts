import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { BearerSecurityOpenAPITemplate, CustomResponse, ResponseOpenAPITemplate } from '../utils/helper'
import { HTTPException } from 'hono/http-exception'
import { sign } from 'hono/jwt'
import { generateNonce, SiweMessage } from 'siwe'
import { config } from '../config'
import mongoose from 'mongoose'
import { googleAuth } from '@hono/oauth-providers/google'
import { xAuth } from '@hono/oauth-providers/x'
import { discordAuth } from '@hono/oauth-providers/discord'
import { jwtGuard } from '../middleware'

export const auth = new OpenAPIHono()

auth.use('/google', googleAuth({
  client_id: config.GOOGLE_CLIENT_ID,
  client_secret: config.GOOGLE_CLIENT_SECRET,
  scope: ['openid', 'email', 'profile'],
}), jwtGuard)
auth.openapi(
  createRoute({
    tags: ['auth'],
    summary: 'google绑定',
    description: '',
    method: 'get',
    path: '/google',
    security: BearerSecurityOpenAPITemplate,
    responses: ResponseOpenAPITemplate,
  }),
  async (c) => {
    const token = c.get('token')
    const grantedScopes = c.get('granted-scopes')
    const user = c.get('user-google')

    const jwtPayload = c.get('jwtPayload')
    if (!jwtPayload) {
      throw new HTTPException(401, { message: 'cannot get token info' })
    }

    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: {
        token,
        grantedScopes,
        user
      }
    }))
  }
)

auth.use('/x', xAuth({
  client_id: config.TWITTER_CLIENT_ID,
  client_secret: config.TWITTER_CLIENT_SECRET,
  scope: ['tweet.read', 'users.read', 'offline.access'],
  fields: ['profile_image_url', 'url', 'name', 'username'],
}), jwtGuard)
auth.openapi(
  createRoute({
    tags: ['auth'],
    summary: 'twitter绑定',
    description: '',
    method: 'get',
    path: '/x',
    security: BearerSecurityOpenAPITemplate,
    responses: ResponseOpenAPITemplate,
  }),
  async (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const grantedScopes = c.get('granted-scopes')
    const user = c.get('user-x')

    const jwtPayload = c.get('jwtPayload')
    if (!jwtPayload) {
      throw new HTTPException(401, { message: 'cannot get token info' })
    }

    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: {
        token,
        refreshToken,
        grantedScopes,
        user
      }
    }))
  }
)

auth.use('/discord', discordAuth({
  client_id: config.DISCORD_CLIENT_ID,
  client_secret: config.DISCORD_CLIENT_SECRET,
  scope: ['identify', 'email'],
}), jwtGuard)
auth.openapi(
  createRoute({
    tags: ['auth'],
    summary: 'discord绑定',
    description: '',
    method: 'get',
    path: '/discord',
    security: BearerSecurityOpenAPITemplate,
    responses: ResponseOpenAPITemplate,
  }),
  async (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const grantedScopes = c.get('granted-scopes')
    const user = c.get('user-discord')

    const jwtPayload = c.get('jwtPayload')
    if (!jwtPayload) {
      throw new HTTPException(401, { message: 'cannot get token info' })
    }

    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: {
        token,
        refreshToken,
        grantedScopes,
        user
      }
    }))
  }
)

auth.openapi(
  createRoute({
    tags: ['auth'],
    summary: '获取nonce',
    description: '',
    method: 'get',
    path: '/siwe/nonce',
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: z.object({
              status: z.number(),
              message: z.string(),
              data: z.string()
            })
          }
        }
      }
    }
  }),
  async (c) => {
    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: generateNonce(),
    }))
  }
)

auth.openapi(
  createRoute({
    tags: ['auth'],
    summary: '验证签名 签发token',
    description: '',
    method: 'post',
    path: '/siwe/verify',
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: z.object({
              nonce: z.string(),
              message: z.string(),
              signature: z.string(),
            })
          }
        }
      }
    },
    responses: ResponseOpenAPITemplate
  }),
  async (c) => {
    const { message, nonce, signature } = c.req.valid('json')
    const siwe = new SiweMessage(message)
    const { success, error, data } = await siwe.verify({ signature, nonce })

    if (!success) {
      throw new HTTPException(400, { message: error?.expected || 'verify failed' })
    }

    const token = await sign({
      address: data.address,
      chainId: data.chainId
    }, config.JWT_SECRET!!)

    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: token,
    }))
  }
)