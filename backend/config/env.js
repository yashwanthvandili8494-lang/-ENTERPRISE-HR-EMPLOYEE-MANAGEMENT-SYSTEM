const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/enterprise_hr_db',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (!env.JWT_SECRET && env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}

if (!env.JWT_SECRET) {
  env.JWT_SECRET = 'test_fallback_jwt_secret_not_for_production';
  env.JWT_REFRESH_SECRET = 'test_fallback_refresh_secret_not_for_production';
}

module.exports = env;
