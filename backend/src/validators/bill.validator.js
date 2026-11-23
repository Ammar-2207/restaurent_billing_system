const { body } = require('express-validator');

/**
 * Validation rules for POST /api/bills — Generate a new bill
 */
const createBillRules = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ObjectId'),

  body('discountType')
    .optional()
    .isIn(['none', 'percentage', 'fixed'])
    .withMessage('Discount type must be none, percentage, or fixed'),

  body('discountValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a non-negative number')
    .custom((value, { req }) => {
      const type = req.body.discountType;
      if (type === 'percentage' && (value < 0 || value > 100)) {
        throw new Error('Percentage discount must be between 0 and 100');
      }
      return true;
    }),
];

/**
 * Validation rules for POST /api/bills/:id/payments — Record a payment
 */
const addPaymentRules = [
  body('paymentMode')
    .notEmpty()
    .withMessage('Payment mode is required')
    .isIn(['cash', 'upi', 'card'])
    .withMessage('Payment mode must be cash, upi, or card'),

  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Payment amount must be greater than 0'),

  body('referenceNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference number cannot exceed 100 characters'),
];

/**
 * Validation rules for PATCH /api/bills/:id/cancel — Admin-only bill cancellation
 */
const cancelBillRules = [
  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isString()
    .withMessage('Cancellation reason must be a string')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Cancellation reason must be between 3 and 500 characters'),
];

module.exports = { createBillRules, addPaymentRules, cancelBillRules };
