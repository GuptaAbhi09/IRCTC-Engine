const crypto = require('crypto');
const prisma = require('../config/prisma');
const redis = require('../config/redis');
const config = require('../config');
const { generateOtp } = require('../utils/otp.util');
const { hashOtp, hashPassword, comparePassword } = require('../utils/crypto.util');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token.util');
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
  const sessionKey = `otp_session:${otpSessionId}`;
  const sessionData = JSON.stringify({
    firstName,
    lastName,
    email,
    hashedPassword,
    hashedOtp,
  });

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
  const sessionKey = `otp_session:${otpSessionId}`;
  const rawSessionData = await redis.get(sessionKey);

  if (!rawSessionData) {
    const error = new Error('OTP session expired or invalid');
    error.statusCode = 400;
    throw error;
  }

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

/**
 * Handles user authentication & token generation for a device
 */
const login = async ({ email, password, deviceId }) => {
  // 1. Find user in Postgres
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 2. Compare password hash
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 3. Check if email is verified
  if (!user.emailVerifiedAt) {
    const error = new Error('Please verify your email address before logging in');
    error.statusCode = 403;
    throw error;
  }

  // 4. Generate Access and Refresh Tokens
  const jti = crypto.randomUUID();
  const tokenPayload = { userId: user.id, email: user.email };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload, jti);

  // 5. Hash refresh token and store session in Redis under key `refresh_token:<userId>:<deviceId>`
  const redisKey = `refresh_token:${user.id}:${deviceId}`;
  const tokenHash = hashOtp(refreshToken);

  const sessionPayload = JSON.stringify({ jti, tokenHash });
  await redis.set(redisKey, sessionPayload, 'EX', config.jwt.refreshExpirySeconds);

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Rotates Refresh Token & Access Token while checking for reuse security breach
 */
const rotateRefreshToken = async ({ refreshToken, deviceId }) => {
  if (!refreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const { userId, jti } = decoded;
  const redisKey = `refresh_token:${userId}:${deviceId}`;
  const rawSessionData = await redis.get(redisKey);

  // Reuse Detection & Security Safeguard
  if (!rawSessionData) {
    const error = new Error('Session expired or invalid. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  const storedSession = JSON.parse(rawSessionData);
  const incomingTokenHash = hashOtp(refreshToken);

  // If jti or tokenHash doesn't match, token reuse attack detected!
  if (storedSession.jti !== jti || storedSession.tokenHash !== incomingTokenHash) {
    // Revoke all active sessions for this user across all devices!
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }

    const error = new Error('Security Alert: Refresh token reuse detected. All active sessions have been revoked.');
    error.statusCode = 401;
    throw error;
  }

  // Generate new token pair and rotate jti
  const newJti = crypto.randomUUID();
  const tokenPayload = { userId: decoded.userId, email: decoded.email };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload, newJti);

  // Update Redis with new jti and new token hash
  const newTokenHash = hashOtp(newRefreshToken);
  const newSessionPayload = JSON.stringify({ jti: newJti, tokenHash: newTokenHash });
  await redis.set(redisKey, newSessionPayload, 'EX', config.jwt.refreshExpirySeconds);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

module.exports = {
  sendOtp,
  verifyOtpAndRegister,
  login,
  rotateRefreshToken,
};
