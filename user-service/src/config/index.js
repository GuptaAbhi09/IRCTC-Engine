require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) 
    : ['*'],
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'default_secret',
  
  // OTP Settings
  otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 600,
  otpRateLimitExpirySeconds: parseInt(process.env.OTP_RATE_LIMIT_EXPIRY_SECONDS, 10) || 60,
  otpCookieName: process.env.OTP_COOKIE_NAME || 'otp_session_id',

  // Email Settings
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'IRCTC Support <no-reply@irctc.com>',
  },
};

module.exports = config;
