const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');
const {
  createBillRules,
  addPaymentRules,
  cancelBillRules,
} = require('../validators/bill.validator');
const {
  createBill,
  getBillById,
  getBillByOrderId,
  getBills,
  addPayment,
  cancelBill,
} = require('../controllers/bill.controller');

const router = express.Router();

// All bill routes require authentication
router.use(authenticate);

// GET /api/bills — List all bills with filters and pagination (admin & cashier)
router.get('/', authorize('admin', 'cashier'), getBills);

// GET /api/bills/order/:orderId — Get bill for a specific order (admin & cashier)
// IMPORTANT: This must come BEFORE '/:id' to avoid 'order' being treated as an ID
router.get('/order/:orderId', authorize('admin', 'cashier'), getBillByOrderId);

// GET /api/bills/:id — Get bill by bill ID (admin & cashier)
router.get('/:id', authorize('admin', 'cashier'), getBillById);

// POST /api/bills — Generate a new bill (admin & cashier)
router.post('/', authorize('admin', 'cashier'), createBillRules, validateRequest, createBill);

// POST /api/bills/:id/payments — Add a payment to an existing bill (admin & cashier)
router.post('/:id/payments', authorize('admin', 'cashier'), addPaymentRules, validateRequest, addPayment);

// PATCH /api/bills/:id/cancel — Admin-only bill cancellation
router.patch('/:id/cancel', authorize('admin'), cancelBillRules, validateRequest, cancelBill);

module.exports = router;
