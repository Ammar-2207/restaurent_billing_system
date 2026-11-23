const User = require('../models/user.model');

/**
 * Controller: Get all staff members (Admin Only)
 * GET /api/staff
 */
const getStaff = async (req, res, next) => {
  try {
    const staff = await User.find({})
      .select('-password')
      .sort({ role: 1, createdAt: -1 });

    const total = staff.length;
    const admins = staff.filter((u) => u.role === 'admin').length;
    const cashiers = staff.filter((u) => u.role === 'cashier').length;
    const active = staff.filter((u) => u.isActive).length;
    const inactive = staff.filter((u) => !u.isActive).length;

    return res.status(200).json({
      success: true,
      count: total,
      data: staff,
      stats: {
        total,
        admins,
        cashiers,
        active,
        inactive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Create a new staff member (Admin Only)
 * POST /api/staff
 */
const createStaff = async (req, res, next) => {
  try {
    const { name, username, email, password, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const targetRole = role === 'admin' ? 'admin' : 'cashier';

    // Duplicate check
    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });
    if (existing) {
      const field = existing.username === cleanUsername ? 'Username' : 'Email';
      return res.status(409).json({
        success: false,
        message: `${field} "${field === 'Username' ? cleanUsername : cleanEmail}" is already registered`,
      });
    }

    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      role: targetRole,
      isActive: true,
    });

    const userJson = user.toJSON();

    return res.status(201).json({
      success: true,
      message: `Staff member ${user.name} (${user.role}) created successfully`,
      data: userJson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update staff member details (Admin Only)
 * PUT /api/staff/:id
 */
const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    const user = await User.findById(id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (name && name.trim()) user.name = name.trim();

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== user.email) {
        const emailTaken = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
        if (emailTaken) {
          return res.status(409).json({ success: false, message: 'Email address is already in use' });
        }
        user.email = cleanEmail;
      }
    }

    if (role && ['admin', 'cashier'].includes(role)) {
      // Prevent changing own role if logged-in user
      if (req.user._id.toString() === id && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'You cannot downgrade your own administrator privileges',
        });
      }
      user.role = role;
    }

    if (password && password.trim().length >= 6) {
      user.password = password.trim();
    }

    await user.save();

    const userJson = user.toJSON();

    return res.status(200).json({
      success: true,
      message: `Staff member ${user.name} updated successfully`,
      data: userJson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Toggle staff active status (Admin Only)
 * PATCH /api/staff/:id/status
 */
const toggleStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own administrative account',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Safeguard: Ensure at least one active admin remains
    if (user.role === 'admin' && user.isActive) {
      const activeAdminsCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the only active administrator in the system',
        });
      }
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Staff member ${user.name} is now ${user.isActive ? 'Active' : 'Deactivated'}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Delete a staff member (Admin Only)
 * DELETE /api/staff/:id
 */
const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (user.username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'The baseline master administrator cannot be deleted',
      });
    }

    if (user.role === 'admin') {
      const activeAdminsCount = await User.countDocuments({ role: 'admin' });
      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only administrator account in the system',
        });
      }
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Staff member ${user.name} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStaff,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
};
