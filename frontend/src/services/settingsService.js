import api from './api';

/**
 * System Settings & Diagnostics Service
 */

export const getSettings = () => api.get('/settings');

export const updateSettings = (settingsData) => api.put('/settings', settingsData);

export const getDiagnostics = () => api.get('/settings/diagnostics');
