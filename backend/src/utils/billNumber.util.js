const { getNextSequence } = require('../models/counter.model');

/**
 * Generate a unique, concurrency-safe bill number: BILL-YYYYMMDD-XXXX
 * Uses atomic MongoDB counter increments — safe under concurrent requests.
 * @returns {Promise<string>} e.g. 'BILL-20261123-0001'
 */
const generateBillNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = await getNextSequence('bill', dateStr);
  return `BILL-${dateStr}-${String(seq).padStart(4, '0')}`;
};

module.exports = { generateBillNumber };
