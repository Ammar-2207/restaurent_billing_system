import { format, parseISO } from 'date-fns';

/**
 * Format currency amount with Indian Rupee symbol
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
export const formatCurrency = (amount = 0, currency = '₹') => {
  return `${currency}${Number(amount).toFixed(2)}`;
};

/**
 * Format ISO date string into readable date-time
 * @param {string|Date} date
 * @param {string} formatPattern
 * @returns {string}
 */
export const formatDateTime = (date, formatPattern = 'MMM dd, yyyy HH:mm') => {
  if (!date) return '-';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, formatPattern);
};
