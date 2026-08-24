const authService = require('../services/auth.service');
const config = require('../config');

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

    // Set httpOnly cookie for session ID
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
        otpSessionId, // Also returned in body for non-cookie clients like mobile apps
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

    // Clear session cookie after successful verification
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

module.exports = {
  sendOtpHandler,
  verifyOtpHandler,
};
