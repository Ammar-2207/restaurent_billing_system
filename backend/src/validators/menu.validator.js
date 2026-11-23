const { body, param } = require('express-validator');
const { allowedCategories } = require('../models/menu.model');

const createMenuItemValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(allowedCategories)
    .withMessage(`Category must be one of: ${allowedCategories.join(', ')}`),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid non-negative number'),
  body('foodType')
    .trim()
    .notEmpty()
    .withMessage('Food type is required')
    .isIn(['veg', 'non-veg'])
    .withMessage('Food type must be either "veg" or "non-veg"'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean value'),
];

const updateMenuItemValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid menu item ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Item name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  body('category')
    .optional()
    .trim()
    .isIn(allowedCategories)
    .withMessage(`Category must be one of: ${allowedCategories.join(', ')}`),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid non-negative number'),
  body('foodType')
    .optional()
    .trim()
    .isIn(['veg', 'non-veg'])
    .withMessage('Food type must be either "veg" or "non-veg"'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean value'),
];

const menuIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid menu item ID format'),
];

const toggleAvailabilityValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid menu item ID format'),
  body('isAvailable')
    .isBoolean()
    .withMessage('isAvailable must be a boolean (true or false)'),
];

module.exports = {
  createMenuItemValidator,
  updateMenuItemValidator,
  menuIdParamValidator,
  toggleAvailabilityValidator,
};
