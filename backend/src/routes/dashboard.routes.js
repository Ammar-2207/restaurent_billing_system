const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getDashboardSummary,
  getPaymentSummary,
  getTopSellingItems,
  getSalesTrend,
} = require('../controllers/dashboard.controller');

const router = express.Router();

// Enforce authentication & Admin-only authorization for all dashboard analytics
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/dashboard/summary — KPIs with yesterday comparison
router.get('/summary', getDashboardSummary);

// GET /api/dashboard/payment-summary — Collections by Cash, UPI, Card
router.get('/payment-summary', getPaymentSummary);

// GET /api/dashboard/top-items — Top-selling menu items by quantity
router.get('/top-items', getTopSellingItems);

// GET /api/dashboard/sales-trend — 7-day sales and collections trend
router.get('/sales-trend', getSalesTrend);

module.exports = router;
