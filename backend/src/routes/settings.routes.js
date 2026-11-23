const express = require('express');
const {
  getSettings,
  updateSettings,
  getSystemDiagnostics,
} = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/settings - Available to all authenticated users
router.get('/', getSettings);

// PUT /api/settings - Admin only
router.put('/', authorize('admin'), updateSettings);

// GET /api/settings/diagnostics - Admin only
router.get('/diagnostics', authorize('admin'), getSystemDiagnostics);

module.exports = router;
