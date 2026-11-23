import api from './api';

/**
 * Staff & Roles Service
 */

export const getStaff = () => api.get('/staff');

export const createStaff = (staffData) => api.post('/staff', staffData);

export const updateStaff = (id, staffData) => api.put(`/staff/${id}`, staffData);

export const toggleStaffStatus = (id) => api.patch(`/staff/${id}/status`);

export const deleteStaff = (id) => api.delete(`/staff/${id}`);
