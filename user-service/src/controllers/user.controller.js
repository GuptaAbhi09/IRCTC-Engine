const userService = require('../services/user.service');

/**
 * Controller to handle GET /api/v1/users/me
 */
const getProfileHandler = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user.userId);
    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/v1/users/me
 */
const updateProfileHandler = async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;
    const updatedUser = await userService.updateUserProfile(req.user.userId, {
      firstName,
      lastName,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfileHandler,
  updateProfileHandler,
};
