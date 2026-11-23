const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const menuRoutes = require('./menu.routes');
const tableRoutes = require('./table.routes');
const orderRoutes = require('./order.routes');
const billRoutes = require('./bill.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

// Health check endpoint mounted at /health -> /api/health
router.use('/health', healthRoutes);

// Authentication & authorization endpoints mounted at /auth -> /api/auth
router.use('/auth', authRoutes);

// Menu catalog endpoints mounted at /menu -> /api/menu
router.use('/menu', menuRoutes);

// Table management endpoints mounted at /tables -> /api/tables
router.use('/tables', tableRoutes);

// Order management endpoints mounted at /orders -> /api/orders
router.use('/orders', orderRoutes);

// Billing & payment endpoints mounted at /bills -> /api/bills
router.use('/bills', billRoutes);

// Dashboard analytics endpoints mounted at /dashboard -> /api/dashboard
router.use('/dashboard', dashboardRoutes);

// Reporting endpoints mounted at /reports -> /api/reports
router.use('/reports', reportRoutes);

module.exports = router;
