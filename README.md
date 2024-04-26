## 依赖
- 安装 AWS CLI https://aws.amazon.com/cn/cli/
- 安装 AWS SAM https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

## 环境变量
- 设置 aws 账户信息
  + 命令行运行 `aws configure`

## 本地开发
- export SAM_CLI_TELEMETRY=0
- `npm run dev` 需要启动docker
- https://github.com/aws/aws-sam-cli/issues/2272

## 部署
- 为了连接DocumentDB, 需要配置lambda的VPC
  + 增加超时时间和内存
- [x](每次部署完需要手动将documentdb global-bundle.pem文件, 传到线上的lambda目录里)
  + 已解决, 请配置afterBundling
- 如果s3 upload超时需要配置, vpc endpoint, 选择s3 Gateway
- dynamodb生产环境需要配置 vpc endpoint
# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
