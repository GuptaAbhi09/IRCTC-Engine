const crypto = require('crypto');
const prisma = require('../config/prisma');
const redis = require('../config/redis');
const config = require('../config');
const { generateOtp } = require('../utils/otp.util');
const { hashOtp, hashPassword, comparePassword } = require('../utils/crypto.util');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token.util');
const { verifyGoogleIdToken } = require('./google.service');
const { publishOtpEvent, publishWelcomeEvent } = require('../producers/auth.producer');

/**
 * Initiates signup flow by validating email, checking rate limits, and publishing OTP event to Kafka
 */
const sendOtp = async ({ firstName, lastName, email, password }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 400;
    throw error;
  }

  const rateLimitKey = `otp_ratelimit:${email}`;
  const isRateLimited = await redis.get(rateLimitKey);

  if (isRateLimited) {
    const error = new Error('Please wait 60 seconds before requesting another OTP');
    error.statusCode = 429;
    throw error;
  }

  const plainOtp = generateOtp();
  const hashedOtp = hashOtp(plainOtp);
  const hashedPassword = await hashPassword(password);
  const otpSessionId = crypto.randomUUID();

  const sessionKey = `otp_session:${otpSessionId}`;
  const sessionData = JSON.stringify({
    firstName,
    lastName,
    email,
    hashedPassword,
    hashedOtp,
  });

  await redis.set(sessionKey, sessionData, 'EX', config.otpExpirySeconds);
  await redis.set(rateLimitKey, '1', 'EX', config.otpRateLimitExpirySeconds);

  // Publish event asynchronously to Kafka topic `notification.email.otp`
  await publishOtpEvent({
    email,
    firstName,
    otp: plainOtp,
  });

  return { otpSessionId };
};

/**
 * Verifies OTP, completes user registration in Postgres, and publishes Welcome event to Kafka
 */
const verifyOtpAndRegister = async ({ otpSessionId, otp }) => {
  if (!otpSessionId || !otp) {
    const error = new Error('OTP session ID and OTP code are required');
    error.statusCode = 400;
    throw error;
  }

  const sessionKey = `otp_session:${otpSessionId}`;
  const rawSessionData = await redis.get(sessionKey);

  if (!rawSessionData) {
    const error = new Error('OTP session expired or invalid');
    error.statusCode = 400;
    throw error;
  }

  const { firstName, lastName, email, hashedPassword, hashedOtp } = JSON.parse(rawSessionData);

  const incomingHashedOtp = hashOtp(otp);
  if (incomingHashedOtp !== hashedOtp) {
    const error = new Error('Invalid OTP code');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      authProvider: 'LOCAL',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  await redis.del(sessionKey);

  // Publish event asynchronously to Kafka topic `notification.email.welcome`
  await publishWelcomeEvent({
    email: user.email,
    firstName: user.firstName,
  });

  return user;
};

/**
 * Handles user authentication & token generation for a device
 */
const login = async ({ email, password, deviceId }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.password) {
    const error = new Error('Account was registered via Google Sign-In. Please log in using Google.');
    error.statusCode = 400;
    throw error;
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.emailVerifiedAt) {
    const error = new Error('Please verify your email address before logging in');
    error.statusCode = 403;
    throw error;
  }

  const jti = crypto.randomUUID();
  const tokenPayload = { userId: user.id, email: user.email };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload, jti);

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
      authProvider: user.authProvider,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Authenticates user via Google id_token, creates/updates record, and issues JWT pair
 */
const googleLogin = async ({ idToken, deviceId }) => {
  const googleUser = await verifyGoogleIdToken(idToken);
  const { email, firstName, lastName } = googleUser;

  let user = await prisma.user.findUnique({
    where: { email },
  });

  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: null,
        emailVerifiedAt: new Date(),
        authProvider: 'GOOGLE',
      },
    });
  } else if (user.authProvider !== 'GOOGLE' || !user.emailVerifiedAt) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        authProvider: 'GOOGLE',
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
      },
    });
  }

  // Publish welcome event for new Google users
  if (isNewUser) {
    await publishWelcomeEvent({
      email: user.email,
      firstName: user.firstName,
    });
  }

  const jti = crypto.randomUUID();
  const tokenPayload = { userId: user.id, email: user.email };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload, jti);

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
      authProvider: user.authProvider,
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

  if (!rawSessionData) {
    const error = new Error('Session expired or invalid. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  const storedSession = JSON.parse(rawSessionData);
  const incomingTokenHash = hashOtp(refreshToken);

  if (storedSession.jti !== jti || storedSession.tokenHash !== incomingTokenHash) {
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }

    const error = new Error('Security Alert: Refresh token reuse detected. All active sessions have been revoked.');
    error.statusCode = 401;
    throw error;
  }

  const newJti = crypto.randomUUID();
  const tokenPayload = { userId: decoded.userId, email: decoded.email };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload, newJti);

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
  googleLogin,
  rotateRefreshToken,
};
