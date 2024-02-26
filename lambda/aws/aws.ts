import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { CustomResponse, ResponseOpenAPITemplate } from '../utils/helper'
import { HTTPException } from 'hono/http-exception'
import { S3Client } from "@aws-sdk/client-s3"
import { Upload } from '@aws-sdk/lib-storage'
import { config } from '../config'
import { nanoid } from 'nanoid'
import { fileTypeFromBuffer } from 'file-type'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { rateLimiter } from '../middleware'
import Redis from 'ioredis'

export const redisClient = new Redis({
  enableOfflineQueue: true,
  host: config.REDIS_URI,
  ...(config.STAGE === 'development' ? {} : { tls: {} })
})

redisClient.on('ready', () => {
  console.info('redis email is ready.')
})
redisClient.on('error', (err) => {
  console.info(err)
});

const s3Client = new S3Client({
  region: 'us-east-1'
})

const sesClient = new SESClient({
  region: 'us-east-1'
})

export const aws = new OpenAPIHono()

aws.openapi(
  createRoute({
    tags: ['aws'],
    summary: '上传文件 (本地环境用不了，请使用线上环境)',
    description: '',
    method: 'post',
    path: '/s3/upload',
    responses: ResponseOpenAPITemplate
  }),
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['file'] as unknown as File
    // console.info('file', body['file'])

    const region = 'us-east-1'
    const binary = file.stream()
    const buffer = await file.arrayBuffer()
    const Key = nanoid() + '-' + file.name
    const bucketName = (config.LAMBDA_STACK_NAME + 'Bucket').toLowerCase()

    try {
      const filetype = await fileTypeFromBuffer(buffer)
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key,
          Body: binary,
          ACL: "public-read", // 设置 ACL 为 public-read，
          ContentType: filetype?.mime
        }
      });

      // upload.on("httpUploadProgress", (progress) => {
      //   console.log(progress); // 可以在这里追踪上传进度
      // });

      await upload.done();

      // 生成公开访问的 URL
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${Key}`;

      return c.json(CustomResponse({
        status: 200,
        message: 'ok',
        data: publicUrl,
      }))
    } catch (e: any) {
      // const { requestId, cfId, extendedRequestId } = res?.$metadata || {}
      throw new HTTPException(400, { message: `Upload Failed: ${e?.message}` })
    }
  }
)

aws.use('/ses/sendVerifyCode', rateLimiter({
  // Basic options
  storeClient: redisClient,
  points: 1, // Number of points
  duration: 60, // Per second(s)

  // Custom
  blockDuration: 60, // block 60s if consumed more than points
  keyPrefix: 'rewardx-email', // must be unique for limiters with different purpose
}))
aws.openapi(
  createRoute({
    tags: ['aws'],
    summary: '发送邮箱验证码 (每分钟1次)',
    description: '',
    method: 'post',
    path: '/ses/sendVerifyCode',
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: z.object({
              to: z.string().email().openapi({ example: 'asterprotocolteam@gmail.com', description: '非正式环境只能发送到此邮箱' })
            })
          }
        }
      }
    },
    responses: ResponseOpenAPITemplate
  }),
  async (c) => {
    const { to } = c.req.valid('json')

    try {
      const code = nanoid(6)

      await redisClient.set(code, to, 'EX', 5 * 60) // 5分钟过期

      const emailParams = {
        Source: "asterprotocolteam@gmail.com", // 发件人邮箱地址
        Destination: {
          ToAddresses: [to], // 收件人邮箱地址列表
        },
        Message: {
          Subject: {
            Data: "Email Verification - Please Verify Your Email" // 邮件主题
          },
          Body: {
            Text: {
              Data: `
              To ensure the security of your account, we require you to verify your email address.

              Verification Code: ${code}

              Please complete the verification within 5 mins. If you have not initiated this action, kindly disregard this email.

              Thank you!
              ` // 邮件正文
            }
          }
        }
      }

      const data = await sesClient.send(new SendEmailCommand(emailParams))

      return c.json(CustomResponse({
        status: 200,
        message: 'ok',
        data: data.MessageId
      }))
    } catch (e: any) {
      throw new HTTPException(400, { message: `Send Failed: ${e?.message}` })
    }
  }
)