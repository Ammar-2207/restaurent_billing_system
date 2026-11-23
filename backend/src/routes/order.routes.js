const express = require('express');
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderItems,
  updateOrderStatus,
  deleteOrderItem,
} = require('../controllers/order.controller');
const {
  createOrderValidator,
  updateOrderValidator,
  updateStatusValidator,
  orderIdParamValidator,
  deleteItemParamValidator,
} = require('../validators/order.validator');
const { validateRequest } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/orders - List & filter orders (Admin & Cashier)
router.get('/', getOrders);

// GET /api/orders/:id - Single order details (Admin & Cashier)
router.get('/:id', orderIdParamValidator, validateRequest, getOrderById);

// POST /api/orders - Create new order (Admin & Cashier)
router.post('/', createOrderValidator, validateRequest, createOrder);

// PUT /api/orders/:id - Update full items/notes in running order (Admin & Cashier)
router.put('/:id', updateOrderValidator, validateRequest, updateOrder);

// PATCH /api/orders/:id/items - Update items in running order (Admin & Cashier)
router.patch('/:id/items', updateOrderValidator, validateRequest, updateOrderItems);

// PATCH /api/orders/:id/status - Update order status (running -> completed/cancelled)
router.patch('/:id/status', updateStatusValidator, validateRequest, updateOrderStatus);

// DELETE /api/orders/:id/items/:itemId - Remove item from running order
router.delete(
  '/:id/items/:itemId',
  deleteItemParamValidator,
  validateRequest,
  deleteOrderItem
);

module.exports = router;
