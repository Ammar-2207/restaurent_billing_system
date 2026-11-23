const express = require('express');
const { getTables, getTableById } = require('../controllers/table.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { param } = require('express-validator');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/tables - View all tables (Admin and Cashier)
router.get('/', getTables);

// GET /api/tables/:id - Single table details
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid table ID format')],
  validateRequest,
  getTableById
);

module.exports = router;
