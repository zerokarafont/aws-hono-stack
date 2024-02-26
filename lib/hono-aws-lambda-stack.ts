import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as dotenv from 'dotenv'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

dotenv.config({ path: `.env.${process.env.STAGE}` })

export class HonoAwsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // FIXME: https://github.com/aws/aws-cdk/issues/26559
    // Create an S3 bucket
    const s3Bucket = new s3.Bucket(this, process.env.LAMBDA_STACK_NAME!! + 'Bucket', {
      bucketName: (process.env.LAMBDA_STACK_NAME!! + 'Bucket').toLowerCase(),
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicPolicy: false,
        blockPublicAcls: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      accessControl: s3.BucketAccessControl.PUBLIC_READ,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      removalPolicy: cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    // 定义一个策略允许公开读取存储桶中的对象
    // const publicReadPolicyStatement = new iam.PolicyStatement({
    //   actions: ['s3:GetObject'],
    //   resources: [s3Bucket.bucketArn + '/*'],
    //   principals: [new iam.AnyPrincipal()],
    // });

    // s3Bucket.addToResourcePolicy(publicReadPolicyStatement);

    const fn = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        STAGE: process.env.STAGE!!,
        API_DOC_NAME: process.env.API_DOC_NAME!!,
        MONGO_URI: process.env.MONGO_URI!!,
        MONGO_DB_NAME: process.env.MONGO_DB_NAME!!,
        REDIS_URI: process.env.REDIS_URI!!,
        JWT_SECRET: process.env.JWT_SECRET!!,
        LAMBDA_STACK_NAME: process.env.LAMBDA_STACK_NAME!!,
        INITIAL_CORS_CONFIGURED: process.env.INITIAL_CORS_CONFIGURED!!,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!!,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!!,
        TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID!!,
        TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET!!,
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!!,
        DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET!!,
      },
      bundling: {
        externalModules: ['aws-sdk-lib'],
      }
    });

    // 创建一个 IAM 策略，允许对所有 DynamoDB 表的访问
    const dynamoDbPolicy = new iam.PolicyStatement({
      actions: ['dynamodb:*'],
      resources: ['*'] // 注意这里使用 '*' 来指代所有资源
    });

    const s3BucketPolicy = new iam.PolicyStatement({
      actions: ['s3:*'],
      effect: iam.Effect.ALLOW,
      resources: [s3Bucket.bucketArn, s3Bucket.arnForObjects('*')]
    });

    const networkInterfacePolicy = new iam.PolicyStatement({
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DeleteNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        // Add any additional permissions needed
      ],
      resources: ['*'], // Be specific about resources in production
    })

    const memorydbPolicy = new iam.PolicyStatement({
      actions: ['memorydb:*'],
      resources: ['*'],
    });

    // 将该策略附加到 Lambda 函数的执行角色上
    fn.role?.attachInlinePolicy(new iam.Policy(this, 'FullAccess', {
      statements: [dynamoDbPolicy, networkInterfacePolicy, s3BucketPolicy, memorydbPolicy]
    }));

    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })
    new apigw.LambdaRestApi(this, process.env.LAMBDA_STACK_NAME!!, {
      handler: fn,
      binaryMediaTypes: ['*~1*', 'multipart/form-data'], // 这里指定支持所有的二进制媒体类型
    });
    // Grant permissions for Lambda to write to the S3 bucket
    s3Bucket.grantReadWrite(fn);
    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'HonoAwsLambdaQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
