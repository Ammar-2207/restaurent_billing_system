const { body, param } = require('express-validator');

const createOrderValidator = [
  body('orderType')
    .trim()
    .notEmpty()
    .withMessage('Order type is required')
    .isIn(['dine-in', 'takeaway'])
    .withMessage('Order type must be either "dine-in" or "takeaway"'),
  body('table')
    .if(body('orderType').equals('dine-in'))
    .notEmpty()
    .withMessage('Table is required for Dine-In orders'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain an array with at least one item'),
  body('items.*.menuItem')
    .isMongoId()
    .withMessage('Invalid menuItem ID format'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer (min 1)'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

const updateOrderValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Items must be an array with at least one item'),
  body('items.*.menuItem')
    .optional()
    .isMongoId()
    .withMessage('Invalid menuItem ID format'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

const updateStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['running', 'completed', 'cancelled'])
    .withMessage('Status must be one of: running, completed, cancelled'),
];

const orderIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID format'),
];

const deleteItemParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  param('itemId')
    .isMongoId()
    .withMessage('Invalid order item ID format'),
];

module.exports = {
  createOrderValidator,
  updateOrderValidator,
  updateStatusValidator,
  orderIdParamValidator,
  deleteItemParamValidator,
};
