const express = require('express');
const {
  getStaff,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
} = require('../controllers/staff.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All staff management routes are Admin Only
router.use(authenticate, authorize('admin'));

// GET /api/staff - List all staff members
router.get('/', getStaff);

// POST /api/staff - Create a staff member
router.post('/', createStaff);

// PUT /api/staff/:id - Update staff details
router.put('/:id', updateStaff);

// PATCH /api/staff/:id/status - Toggle active/inactive
router.patch('/:id/status', toggleStaffStatus);

// DELETE /api/staff/:id - Delete staff member
router.delete('/:id', deleteStaff);

module.exports = router;
