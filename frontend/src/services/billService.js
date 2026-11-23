import api from './api';

/**
 * Billing Service — All bill-related API calls
 */

/**
 * Generate a bill for a running order
 * @param {string} orderId
 * @param {object} options - { discountType, discountValue }
 */
export const createBill = (orderId, { discountType = 'none', discountValue = 0 } = {}) =>
  api.post('/bills', { orderId, discountType, discountValue });

/**
 * Get a bill by its MongoDB ID
 * @param {string} billId
 */
export const getBillById = (billId) => api.get(`/bills/${billId}`);

/**
 * Get a bill for a specific order
 * @param {string} orderId
 */
export const getBillByOrderId = (orderId) => api.get(`/bills/order/${orderId}`);

/**
 * List all bills with optional filters
 * @param {object} params - { status, paymentStatus, orderType, date, search }
 */
export const getBills = (params = {}) => api.get('/bills', { params });

/**
 * Add a payment entry to a bill
 * @param {string} billId
 * @param {object} payment - { paymentMode, amount, referenceNumber? }
 */
export const addPayment = (billId, payment) =>
  api.post(`/bills/${billId}/payments`, payment);

/**
 * Cancel a bill with required reason (Admin only)
 * @param {string} billId
 * @param {string} reason
 */
export const cancelBill = (billId, reason) =>
  api.patch(`/bills/${billId}/cancel`, { reason });
