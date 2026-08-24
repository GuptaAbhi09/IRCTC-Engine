const crypto = require('crypto');
const prisma = require('../config/prisma');
const redis = require('../config/redis');
const config = require('../config');
const { generateOtp } = require('../utils/otp.util');
const { hashOtp, hashPassword } = require('../utils/crypto.util');
const { sendEmail } = require('./mail.service');
const { getOtpEmailTemplate } = require('../templates/otp-email.template');

/**
 * Initiates signup flow by validating email, checking rate limits, and sending OTP
 */
const sendOtp = async ({ firstName, lastName, email, password }) => {
  // 1. Check if user already exists in Postgres
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 400;
    throw error;
  }

  // 2. Check rate limit in Redis (60-second cooldown)
  const rateLimitKey = `otp_ratelimit:${email}`;
  const isRateLimited = await redis.get(rateLimitKey);

  if (isRateLimited) {
    const error = new Error('Please wait 60 seconds before requesting another OTP');
    error.statusCode = 429;
    throw error;
  }

  // 3. Generate OTP and Session ID
  const plainOtp = generateOtp();
  const hashedOtp = hashOtp(plainOtp);
  const hashedPassword = await hashPassword(password);
  const otpSessionId = crypto.randomUUID();

  // 4. Store session payload in Redis with 10-minute TTL
  // Create a unique Redis key using the session UUID
  const sessionKey = `otp_session:${otpSessionId}`;
  // Serialize user registration data into a JSON string because Redis stores strings
  const sessionData = JSON.stringify({
    firstName,
    lastName,
    email,
    hashedPassword,
    hashedOtp,
  });

  // Save session data in Redis with automatic expiration (TTL = 10 mins / 600s)
  // 'EX' tells Redis to set expiration in seconds
  await redis.set(sessionKey, sessionData, 'EX', config.otpExpirySeconds);

  // 5. Set rate limit key with 60-second TTL
  await redis.set(rateLimitKey, '1', 'EX', config.otpRateLimitExpirySeconds);

  // 6. Send OTP Email
  const emailHtml = getOtpEmailTemplate(firstName, plainOtp);
  await sendEmail(email, 'Verify your IRCTC Account - OTP', emailHtml);

  return { otpSessionId };
};

/**
 * Verifies OTP and completes user registration in Postgres
 */
const verifyOtpAndRegister = async ({ otpSessionId, otp }) => {
  if (!otpSessionId || !otp) {
    const error = new Error('OTP session ID and OTP code are required');
    error.statusCode = 400;
    throw error;
  }

  // 1. Retrieve OTP session from Redis
  // Reconstruct the exact Redis key using the incoming otpSessionId
  const sessionKey = `otp_session:${otpSessionId}`;
  // Fetch stored JSON string from Redis
  const rawSessionData = await redis.get(sessionKey);

  if (!rawSessionData) {
    const error = new Error('OTP session expired or invalid');
    error.statusCode = 400;
    throw error;
  }
  // Convert JSON string back into a JavaScript object
  const { firstName, lastName, email, hashedPassword, hashedOtp } = JSON.parse(rawSessionData);

  // 2. Verify incoming OTP hash matches stored OTP hash
  const incomingHashedOtp = hashOtp(otp);
  if (incomingHashedOtp !== hashedOtp) {
    const error = new Error('Invalid OTP code');
    error.statusCode = 400;
    throw error;
  }

  // 3. Create User in PostgreSQL via Prisma
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      emailVerifiedAt: new Date(),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  // 4. Cleanup Redis session
  await redis.del(sessionKey);

  return user;
};

module.exports = {
  sendOtp,
  verifyOtpAndRegister,
};
