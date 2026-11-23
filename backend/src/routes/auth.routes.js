const express = require('express');
const { login, getMe, logout } = require('../controllers/auth.controller');
const { loginValidator } = require('../validators/auth.validator');
const { validateRequest } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public login endpoint
router.post('/login', loginValidator, validateRequest, login);

// Authenticated session check
router.get('/me', authenticate, getMe);

// Authenticated logout endpoint
router.post('/logout', authenticate, logout);

// Role-protected test route: Admin only
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted: You have administrative privileges.',
    user: {
      name: req.user.name,
      role: req.user.role,
    },
  });
});

// Role-protected test route: Billing Operations (Admin and Cashier)
router.get(
  '/cashier-access',
  authenticate,
  authorize('admin', 'cashier'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Access granted: You have access to billing and order operations.',
      user: {
        name: req.user.name,
        role: req.user.role,
      },
    });
  }
);

module.exports = router;
