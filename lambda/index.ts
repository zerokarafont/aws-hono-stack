import { handle } from 'hono/aws-lambda'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { swaggerUI } from '@hono/swagger-ui'
import { example } from './example';
import { CustomResponse } from './utils/helper'
import { OpenAPIHono } from '@hono/zod-openapi'
// import * as dynamoose from 'dynamoose'
import mongoose from 'mongoose'
import { config } from './config'
import { z } from '@hono/zod-openapi'
import { auth } from './auth'
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'
import { aws } from './aws'
import * as path from 'path'
import { rateLimiter } from './middleware'
import Redis from 'ioredis'

// async function initializeDynamoDB() {
//   const ddb = new dynamoose.aws.ddb.DynamoDB({
//     // credentials: {
//     //   accessKeyId: config.AWS_ACCESS_KEY_ID as string,
//     //   secretAccessKey: config.AWS_SECRET_ACCESS_KEY as string
//     // },
//     region: config.STAGE === 'production' ? 'us-east-1' : 'us-west-2'
//   });

//   // Set DynamoDB instance to the Dynamoose DDB instance
//   dynamoose.aws.ddb.set(ddb)

//   console.info(`successfully connect dynamodb`)

//   // initialize table
//   // FIXME: 没反应
//   // if (config.STAGE === 'development') {
//   //   const tables = await ddb.listTables({}).catch(console.error)
//   //   if (!tables?.TableNames?.includes('unichat_friends')) {
//   //     const Friend = dynamoose.model('Friend', FriendSchema, { tableName: 'unichat_friends' })
//   //     const Table = new dynamoose.Table('unichat_friends', [Friend])
//   //     await Table.create()
//   //     console.info('Create Table Friend')
//   //   }
//   // }
// }

const redisClient = new Redis({
  enableOfflineQueue: true,
  host: config.REDIS_URI,
  ...(config.STAGE === 'development' ? {} : { tls: {} })
})

redisClient.on('ready', () => {
  console.info('redis is ready.')
})
redisClient.on('error', (err) => {
  console.info(err)
});

async function initializeDocumentDB() {
  await mongoose.connect(
    config.MONGO_URI as string,
    {
      autoIndex: false,
      autoCreate: config.STAGE === 'development',
      dbName: config.MONGO_DB_NAME,
      ...(config.STAGE === 'development' ? {} : {
        tls: config.STAGE === 'production',
        tlsCAFile: path.join(__dirname, 'global-bundle.pem'),
        replicaSet: 'rs0',
        retryWrites: false,
        directConnection: true
      })
    }
  ).catch(console.info)
  console.info(`sucessfully connect to documentdb`)
}

async function initializeS3Bucket() {
  if (config.INITIAL_CORS_CONFIGURED === 'false') {
    const client = new S3Client({
      region: 'us-east-1'
    })
    const command = new PutBucketCorsCommand({
      Bucket: (config.LAMBDA_STACK_NAME + 'Bucket').toLowerCase(),
      CORSConfiguration: {
        CORSRules: [
          {
            // Allow all headers to be sent to this bucket.
            AllowedHeaders: ["*"],
            // Allow only GET and PUT methods to be sent to this bucket.
            AllowedMethods: ["GET", "PUT"],
            // Allow only requests from the specified origin.
            AllowedOrigins: ["*"],
            // Allow the entity tag (ETag) header to be returned in the response. The ETag header
            // The entity tag represents a specific version of the object. The ETag reflects
            // changes only to the contents of an object, not its metadata.
            ExposeHeaders: ["ETag"],
            // How long the requesting browser should cache the preflight response. After
            // this time, the preflight request will have to be made again.
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })

    await client.send(command)
  }
}

async function configure() {
  // await initializeDynamoDB()
  await initializeDocumentDB()
  await initializeS3Bucket()
  console.info('successfully initialized configuration')
}

configure()

const app = new OpenAPIHono()

app.use(
  '*',
  cors({ origin: '*' }),
  secureHeaders(),
  rateLimiter({
    // Basic options
    storeClient: redisClient,
    points: 6, // Number of points
    duration: 1, // Per second(s)

    // Custom
    blockDuration: 60, // block 60s if consumed more than points
    keyPrefix: 'rewardx-limiter', // must be unique for limiters with different purpose
  }),
  logger()
)

app.openAPIRegistry.registerComponent("securitySchemes", "bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT"
});

app.get('/ui', swaggerUI({ url: '/doc' }))

app.doc('/doc', {
  info: {
    title: config.API_DOC_NAME as string,
    version: 'v1'
  },
  openapi: '3.0.0'
})

app.route('/aws', aws)
app.route('/auth', auth)
app.route('/example', example)

app.notFound((c) => {
  return c.notFound()
})

app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json(CustomResponse({
      status: 400,
      message: err.message,
      data: null
    }))
  }
  if (err instanceof HTTPException) {
    if (err.status === 400) {
      c.status(200)
    } else {
      c.status(err.status)
    }

    return c.json(CustomResponse({
      status: err.status,
      message: err.message,
      data: null
    }))
  }
  return new Response(err.message, {
    status: 500,
  })
})

export const handler = handle(app)
