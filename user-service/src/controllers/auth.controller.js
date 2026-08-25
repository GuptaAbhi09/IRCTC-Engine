const authService = require('../services/auth.service');
const config = require('../config');
const { getDeviceId } = require('../utils/device.util');

/**
 * Controller to handle POST /send-otp
 */
const sendOtpHandler = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields (firstName, lastName, email, password) are required',
      });
    }

    const { otpSessionId } = await authService.sendOtp({
      firstName,
      lastName,
      email,
      password,
    });

    res.cookie(config.otpCookieName, otpSessionId, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: config.otpExpirySeconds * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email address successfully',
      data: {
        otpSessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /verify
 */
const verifyOtpHandler = async (req, res, next) => {
  try {
    const otpSessionId = req.cookies[config.otpCookieName] || req.body.otpSessionId;
    const { otp } = req.body;

    if (!otpSessionId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP session ID cookie or body param, and OTP code are required',
      });
    }

    const user = await authService.verifyOtpAndRegister({
      otpSessionId,
      otp,
    });

    res.clearCookie(config.otpCookieName);

    return res.status(201).json({
      success: true,
      message: 'Account verified and created successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /login
 */
const loginHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }
    // Get device ID from request
    const deviceId = getDeviceId(req);   
    // Call login service
    const { user, accessToken, refreshToken } = await authService.login({
      email,
      password,
      deviceId,
    });

    // Set httpOnly cookies for Access Token & Refresh Token
    res.cookie(config.jwt.accessTokenCookieName, accessToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: config.jwt.accessExpirySeconds * 1000,
    });

    res.cookie(config.jwt.refreshTokenCookieName, refreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: config.jwt.refreshExpirySeconds * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /refresh
 */
const refreshHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies[config.jwt.refreshTokenCookieName] || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token cookie or body param is required',
      });
    }

    const deviceId = getDeviceId(req);
    const { accessToken, refreshToken: newRefreshToken } = await authService.rotateRefreshToken({
      refreshToken,
      deviceId,
    });

    // Overwrite cookies with rotated tokens
    res.cookie(config.jwt.accessTokenCookieName, accessToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: config.jwt.accessExpirySeconds * 1000,
    });

    res.cookie(config.jwt.refreshTokenCookieName, newRefreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: config.jwt.refreshExpirySeconds * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Tokens rotated successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtpHandler,
  verifyOtpHandler,
  loginHandler,
  refreshHandler,
};
