export default () => ({
  app: {
    name: process.env.APP_NAME || 'kyc-service',
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kyc_db',
  },
  sumsub: {
    appToken: process.env.SUMSUB_APP_TOKEN,
    secretKey: process.env.SUMSUB_SECRET_KEY,
    baseUrl: process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com',
    webhookSecret: process.env.SUMSUB_WEBHOOK_SECRET,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
