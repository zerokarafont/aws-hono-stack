export const config = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  STAGE: process.env.STAGE,
  MONGO_URI: process.env.MONGO_URI,
  MONGO_DB_NAME: process.env.MONGO_DB_NAME,
  REDIS_URI: process.env.REDIS_URI,
  API_DOC_NAME: process.env.API_DOC_NAME,
  JWT_SECRET: process.env.JWT_SECRET,
  LAMBDA_STACK_NAME: process.env.LAMBDA_STACK_NAME!!,
  INITIAL_CORS_CONFIGURED: process.env.INITIAL_CORS_CONFIGURED!!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!!,
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID!!,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET!!,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!!,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET!!,
}

export const REWARDX_CONFIG = {
  initial_referral_commission_rate: 0.02, // 初始化返佣率 2%
}