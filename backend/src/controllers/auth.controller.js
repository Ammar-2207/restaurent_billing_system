const User = require('../models/user.model');
const { generateToken } = require('../utils/token.util');

/**
 * Controller: Authenticate user & return JWT token
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const trimmedIdentifier = identifier ? identifier.trim().toLowerCase() : '';

    // Search for user matching either username or email
    const user = await User.findOne({
      $or: [{ username: trimmedIdentifier }, { email: trimmedIdentifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
      });
    }

    // Verify account active status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // Verify password hash
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
      });
    }

    // Generate JWT token with user id, role, and username
    const token = generateToken({
      id: user._id,
      role: user.role,
      username: user.username,
    });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get currently authenticated user
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Logout current session
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  // Stateless JWT logout acknowledgment
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = {
  login,
  getMe,
  logout,
};
