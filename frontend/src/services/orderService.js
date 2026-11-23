import api from './api';

/**
 * Fetch orders with multi-criteria filtering
 * @param {Object} params - { orderType, status, table, date, search }
 */
export const getOrders = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.orderType && params.orderType !== 'All') {
    queryParams.append('orderType', params.orderType);
  }
  if (params.status && params.status !== 'All') {
    queryParams.append('status', params.status);
  }
  if (params.table && params.table !== 'All') {
    queryParams.append('table', params.table);
  }
  if (params.date) {
    queryParams.append('date', params.date);
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/orders?${queryString}` : '/orders';

  const response = await api.get(url);
  return response.data;
};

/**
 * Fetch single order by ID
 * @param {string} id
 */
export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

/**
 * Create a new order (Dine-In or Takeaway)
 * @param {Object} orderData - { orderType, table, items, notes }
 */
export const createOrder = async (orderData) => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

/**
 * Update full items or notes of a running order
 * @param {string} id
 * @param {Object} orderData - { items, notes }
 */
export const updateOrder = async (id, orderData) => {
  const response = await api.put(`/orders/${id}`, orderData);
  return response.data;
};

/**
 * Update items list in running order
 * @param {string} id
 * @param {Array} items
 */
export const updateOrderItems = async (id, items) => {
  const response = await api.patch(`/orders/${id}/items`, { items });
  return response.data;
};

/**
 * Update order status (running -> completed / cancelled)
 * @param {string} id
 * @param {string} status - 'running' | 'completed' | 'cancelled'
 */
export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`/orders/${id}/status`, { status });
  return response.data;
};

/**
 * Delete a single item from a running order
 * @param {string} id
 * @param {string} itemId
 */
export const deleteOrderItem = async (id, itemId) => {
  const response = await api.delete(`/orders/${id}/items/${itemId}`);
  return response.data;
};
