// Centralised configuration loaded from environment variables.

import 'dotenv/config';

const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arena',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-please-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  isTest: process.env.NODE_ENV === 'test',
};

// Fail fast rather than running production with the insecure default secret.
if (config.jwtSecret === 'dev-only-secret-please-change-in-production' && process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to start in production with the default JWT_SECRET. Set JWT_SECRET.');
}

export default config;
