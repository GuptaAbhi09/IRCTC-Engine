require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) 
    : ['*'],
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Kafka Settings
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'user-service-producer',
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  },

  // JWT Settings
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    accessExpirySeconds: parseInt(process.env.JWT_ACCESS_EXPIRY_SECONDS, 10) || 900, // 15 mins
    refreshExpirySeconds: parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS, 10) || 604800, // 7 days
    accessTokenCookieName: 'access_token',
    refreshTokenCookieName: 'refresh_token',
  },

  // Google OAuth Settings
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  
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
