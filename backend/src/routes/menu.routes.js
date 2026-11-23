const express = require('express');
const {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
} = require('../controllers/menu.controller');
const {
  createMenuItemValidator,
  updateMenuItemValidator,
  menuIdParamValidator,
  toggleAvailabilityValidator,
} = require('../validators/menu.validator');
const { validateRequest } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All menu routes require authentication
router.use(authenticate);

// GET /api/menu - List & search items (Admin: all, Cashier: available only)
router.get('/', getMenuItems);

// GET /api/menu/:id - Single item details
router.get('/:id', menuIdParamValidator, validateRequest, getMenuItemById);

// POST /api/menu - Create item (Admin only)
router.post(
  '/',
  authorize('admin'),
  createMenuItemValidator,
  validateRequest,
  createMenuItem
);

// PUT /api/menu/:id - Update item (Admin only)
router.put(
  '/:id',
  authorize('admin'),
  updateMenuItemValidator,
  validateRequest,
  updateMenuItem
);

// PATCH /api/menu/:id/availability - Toggle availability (Admin only)
router.patch(
  '/:id/availability',
  authorize('admin'),
  toggleAvailabilityValidator,
  validateRequest,
  toggleAvailability
);

// DELETE /api/menu/:id - Delete item (Admin only)
router.delete(
  '/:id',
  authorize('admin'),
  menuIdParamValidator,
  validateRequest,
  deleteMenuItem
);

module.exports = router;
