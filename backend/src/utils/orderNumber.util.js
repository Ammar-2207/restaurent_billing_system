const { getNextSequence } = require('../models/counter.model');
const Order = require('../models/order.model');

/**
 * Generate a clean, unique human-readable order number: ORD-YYYYMMDD-XXXX
 * Uses atomic MongoDB counter increments with collision fallback.
 */
const generateOrderNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;

  try {
    const seq = await getNextSequence('order', dateStr);
    let counter = seq;
    let orderNumber = `${prefix}${String(counter).padStart(4, '0')}`;

    // Collision safety loop (in case seeded/existing orders were created without counter)
    while (await Order.exists({ orderNumber })) {
      counter++;
      orderNumber = `${prefix}${String(counter).padStart(4, '0')}`;
    }

    return orderNumber;
  } catch {
    // Fallback if counter fails
    const countToday = await Order.countDocuments({});
    let counter = countToday + 1;
    let orderNumber = `${prefix}${String(counter).padStart(4, '0')}`;
    while (await Order.exists({ orderNumber })) {
      counter++;
      orderNumber = `${prefix}${String(counter).padStart(4, '0')}`;
    }
    return orderNumber;
  }
};

module.exports = {
  generateOrderNumber,
};
