import api from './api';

/**
 * Fetch menu items with optional search & filter parameters
 * @param {Object} params - { search, category, foodType, isAvailable, sort }
 */
export const getMenuItems = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.category && params.category !== 'All') queryParams.append('category', params.category);
  if (params.foodType && params.foodType !== 'All') queryParams.append('foodType', params.foodType);
  if (params.isAvailable !== undefined && params.isAvailable !== 'All') {
    queryParams.append('isAvailable', params.isAvailable);
  }
  if (params.sort) queryParams.append('sort', params.sort);

  const queryString = queryParams.toString();
  const url = queryString ? `/menu?${queryString}` : '/menu';

  const response = await api.get(url);
  return response.data;
};

/**
 * Fetch a single menu item by ID
 * @param {string} id
 */
export const getMenuItemById = async (id) => {
  const response = await api.get(`/menu/${id}`);
  return response.data;
};

/**
 * Create a new menu item (Admin only)
 * @param {Object} data - { name, category, price, foodType, description, isAvailable }
 */
export const createMenuItem = async (data) => {
  const response = await api.post('/menu', data);
  return response.data;
};

/**
 * Update existing menu item (Admin only)
 * @param {string} id
 * @param {Object} data
 */
export const updateMenuItem = async (id, data) => {
  const response = await api.put(`/menu/${id}`, data);
  return response.data;
};

/**
 * Toggle menu item availability (Admin only)
 * @param {string} id
 * @param {boolean} isAvailable
 */
export const toggleMenuAvailability = async (id, isAvailable) => {
  const response = await api.patch(`/menu/${id}/availability`, { isAvailable });
  return response.data;
};

/**
 * Delete a menu item (Admin only)
 * @param {string} id
 */
export const deleteMenuItem = async (id) => {
  const response = await api.delete(`/menu/${id}`);
  return response.data;
};
