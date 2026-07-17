import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nodepilot',
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'nodepilot-super-secure-jwt-secret-key-123456',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'nodepilot-super-secure-jwt-refresh-secret-key-123456',
    expiresIn: process.env.JWT_EXPIRE || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  providers: {
    hetzner: {
      token: process.env.HETZNER_API_TOKEN || '',
    },
    digitalocean: {
      token: process.env.DIGITALOCEAN_API_TOKEN || '',
    },
    contabo: {
      clientId: process.env.CONTABO_CLIENT_ID || '',
      clientSecret: process.env.CONTABO_CLIENT_SECRET || '',
      username: process.env.CONTABO_USERNAME || '',
      password: process.env.CONTABO_PASSWORD || '',
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    },
  },
};
