const authService = require('../services/auth.service');
const config = require('../config');

/**
 * Controller to handle POST /send-otp
 */
const sendOtpHandler = async (req, res, next) => {
  try {
    // Destructure the request body
    const { firstName, lastName, email, password } = req.body;

    // Validate the request body
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields (firstName, lastName, email, password) are required',
      });
    }

    // Call the auth service to send OTP - sends OTP to the user's email address and returns an OTP session ID
    const { otpSessionId } = await authService.sendOtp({
      firstName,
      lastName,
      email,
      password,
    });

    // Set httpOnly cookie for session ID - stores the OTP session ID in an httpOnly cookie
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
    // Get OTP session ID from cookie or request body
    const otpSessionId = req.cookies[config.otpCookieName] || req.body.otpSessionId;
    // Get OTP from request body
    const { otp } = req.body;

    if (!otpSessionId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP session ID cookie or body param, and OTP code are required',
      });
    }

    // Call the auth service to verify OTP and register user - verifies the OTP and registers the user, then returns the created user
    const user = await authService.verifyOtpAndRegister({
      otpSessionId,
      otp,
    });

    // Clear session cookie after successful verification - removes the OTP session cookie after successful verification
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
