const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getDailySalesReport,
  getPaymentReport,
  getItemSalesReport,
  getDayEndReport,
} = require('../controllers/report.controller');

const router = express.Router();

// Enforce authentication & Admin-only authorization for all financial reports
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/reports/daily-sales — Sales, taxes, balances for date range
router.get('/daily-sales', getDailySalesReport);

// GET /api/reports/payment-summary — Mode-wise collections breakdown
router.get('/payment-summary', getPaymentReport);

// GET /api/reports/item-sales — Item-wise quantities and revenues
router.get('/item-sales', getItemSalesReport);

// GET /api/reports/day-end — Printable day-end summary for specific date
router.get('/day-end', getDayEndReport);

module.exports = router;
