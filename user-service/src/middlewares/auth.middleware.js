/**
 * Microservice Authentication Middleware: Reads verified user identity 
 * injected into HTTP headers by the API Gateway (x-user-id, x-user-email)
 */
const authenticateUser = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. Request must be routed through API Gateway.',
      });
    }

    req.user = {
      userId,
      email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateUser,
};

