import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { CustomResponse } from '../utils/helper';
import mongoose from 'mongoose';
import * as dynamoose from 'dynamoose'
import { jwtGuard } from '../middleware';
import { sign } from 'hono/jwt'
import { config } from '../config';

export const example = new OpenAPIHono()

example.openapi(
  createRoute({
    tags: ['example'],
    summary: 'get param示例',
    description: '',
    method: 'get',
    path: '/{id}',
    request: {
      params: z.object({
        id: z.string().openapi({
          param: {
            name: 'id',
            in: 'path'
          }
        })
      })
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: z.object({
              status: z.number(),
              message: z.string(),
              data: z.any()
            })
          }
        }
      }
    }
  }),
  async (c) => {
    const { id } = c.req.valid('param')

    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: `param: ${id}`
    }))
  }
);

example.openapi(
  createRoute({
    tags: ['example'],
    summary: 'get query示例',
    description: '',
    method: 'get',
    path: '/',
    request: {
      query: z.object({
        id: z.string().openapi({
          param: {
            name: 'id',
            in: 'query'
          }
        })
      })
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: z.object({
              status: z.number(),
              message: z.string(),
              data: z.any()
            })
          }
        }
      }
    }
  }),
  async (c) => {
    const { id } = c.req.valid('query')
    // c.req.query()

    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: `query: ${id}`
    }))
  }
);

// example.openapi(
//   createRoute({
//     tags: ['example'],
//     summary: 'post mongodb示例',
//     description: '',
//     method: 'post',
//     path: '/create',
//     request: {
//       body: {
//         required: true,
//         content: {
//           'application/json': {
//             schema: z.object({
//               name: z.string().optional(),
//               age: z.number().optional(),
//               gender: z.string().optional().openapi({ description: '性别 (可选)' })
//             })
//           }
//         }
//       }
//     },
//     responses: {
//       200: {
//         description: '',
//         content: {
//           'application/json': {
//             schema: z.object({
//               status: z.number(),
//               message: z.string(),
//               data: z.any()
//             })
//           }
//         }
//       }
//     }
//   }),
//   async (c) => {
//     // const { name, age, gender } = c.req.valid('json')

//     // if (age > 150) {
//     //   throw new HTTPException(400, { message: '建国后不许成精' })
//     // }
//     const Message = mongoose.model('Message', MessageSchema)
//     const message = new Message({ type: 'test', sender_id: new mongoose.Types.ObjectId(), group_id: new mongoose.Types.ObjectId() })
//     const resp = await message.save()

//     return c.json(CustomResponse({
//       status: 200,
//       message: 'ok',
//       data: resp.toJSON()
//     }))
//   }
// )

example.use('/test/jwt', jwtGuard)
example.openapi(
  createRoute({
    tags: ['example'],
    summary: 'jwt校验示例',
    description: '',
    method: 'post',
    path: '/test/jwt',
    security: [
      {
        bearer: [],
      }
    ],
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: z.object({
              name: z.string().optional(),
              age: z.number().optional(),
              gender: z.string().optional().openapi({ description: '性别 (可选)' })
            })
          }
        }
      }
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: z.object({
              status: z.number(),
              message: z.string(),
              data: z.any()
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
      data: 'jwt pass'
    }))
  }
)

example.openapi(
  createRoute({
    tags: ['example'],
    summary: '获取测试token',
    description: '',
    method: 'post',
    path: '/gen/jwt',
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: z.object({
              address: z.string().openapi({ description: '钱包地址' }),
              userId: z.string().openapi({ description: '用户id' }),
              sub: z.string().optional().openapi({ description: '用户名 (可选)' }),
            })
          }
        }
      }
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: z.object({
              status: z.number(),
              message: z.string(),
              data: z.any()
            })
          }
        }
      }
    }
  }),
  async (c) => {
    const { address, sub, userId } = c.req.valid('json')
    const payload = {
      userId,
      address: address.toLowerCase(),
      sub
    }

    const token = await sign(payload, config.JWT_SECRET!!)

    return c.json(CustomResponse({
      status: 200,
      message: 'ok',
      data: token,
    }))
  }
)