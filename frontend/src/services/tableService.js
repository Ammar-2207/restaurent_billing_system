import api from './api';

/**
 * Fetch all 10 tables with active order details
 */
export const getTables = async () => {
  const response = await api.get('/tables');
  return response.data;
};

/**
 * Fetch a single table by ID
 * @param {string} id
 */
export const getTableById = async (id) => {
  const response = await api.get(`/tables/${id}`);
  return response.data;
};
