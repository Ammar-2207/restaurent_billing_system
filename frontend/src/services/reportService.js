import api from './api';

/**
 * Dashboard & Reports Service
 * All endpoints are Admin-only on the backend.
 */

// ── Dashboard Analytics ───────────────────────────────────────────────────────

export const getDashboardSummary = (params = {}) =>
  api.get('/dashboard/summary', { params });

export const getDashboardPaymentSummary = (params = {}) =>
  api.get('/dashboard/payment-summary', { params });

export const getDashboardTopItems = (params = {}) =>
  api.get('/dashboard/top-items', { params });

export const getDashboardSalesTrend = (params = {}) =>
  api.get('/dashboard/sales-trend', { params });

// ── Reports ───────────────────────────────────────────────────────────────────

export const getDailySalesReport = (params = {}) =>
  api.get('/reports/daily-sales', { params });

export const getPaymentReport = (params = {}) =>
  api.get('/reports/payment-summary', { params });

export const getItemSalesReport = (params = {}) =>
  api.get('/reports/item-sales', { params });

export const getDayEndReport = (params = {}) =>
  api.get('/reports/day-end', { params });
