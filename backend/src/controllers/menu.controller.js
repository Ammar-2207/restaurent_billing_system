const { Menu } = require('../models/menu.model');

/**
 * Controller: Get all menu items with search and filters
 * GET /api/menu
 * Permissions: Admin (all), Cashier (read-only, available items only)
 */
const getMenuItems = async (req, res, next) => {
  try {
    const { search, category, foodType, isAvailable, sort = 'category' } = req.query;

    const filter = {};

    // Cashier role MUST only see available items
    if (req.user.role === 'cashier') {
      filter.isAvailable = true;
    } else if (isAvailable !== undefined && isAvailable !== '') {
      filter.isAvailable = isAvailable === 'true';
    }

    // Category filter
    if (category && category !== 'All') {
      filter.category = category;
    }

    // Food type filter (veg / non-veg)
    if (foodType && foodType !== 'All') {
      filter.foodType = foodType;
    }

    // Search query on item name or description
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    // Sorting
    let sortOptions = { category: 1, name: 1 };
    if (sort === 'price-asc') sortOptions = { price: 1 };
    if (sort === 'price-desc') sortOptions = { price: -1 };
    if (sort === 'name-asc') sortOptions = { name: 1 };
    if (sort === 'newest') sortOptions = { createdAt: -1 };

    const items = await Menu.find(filter).sort(sortOptions);

    // Compute live stats for dashboard cards
    const [totalCount, availableCount, unavailableCount, vegCount, nonVegCount] =
      await Promise.all([
        Menu.countDocuments({}),
        Menu.countDocuments({ isAvailable: true }),
        Menu.countDocuments({ isAvailable: false }),
        Menu.countDocuments({ foodType: 'veg' }),
        Menu.countDocuments({ foodType: 'non-veg' }),
      ]);

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      stats: {
        total: totalCount,
        available: availableCount,
        unavailable: unavailableCount,
        veg: vegCount,
        nonVeg: nonVegCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get single menu item by ID
 * GET /api/menu/:id
 */
const getMenuItemById = async (req, res, next) => {
  try {
    const item = await Menu.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Cashiers cannot view unavailable items
    if (req.user.role === 'cashier' && !item.isAvailable) {
      return res.status(404).json({
        success: false,
        message: 'Menu item is currently unavailable',
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Create a new menu item
 * POST /api/menu
 * Permissions: Admin only
 */
const createMenuItem = async (req, res, next) => {
  try {
    const { name, category, price, foodType, description, isAvailable } = req.body;

    // Check if an item with the exact same name already exists in this category
    const existing = await Menu.findOne({
      name: new RegExp(`^${name.trim()}$`, 'i'),
      category,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A menu item named "${name}" already exists in the "${category}" category.`,
      });
    }

    const newItem = await Menu.create({
      name: name.trim(),
      category,
      price: Number(price),
      foodType,
      description: description ? description.trim() : '',
      isAvailable: isAvailable !== undefined ? isAvailable : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: newItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update existing menu item
 * PUT /api/menu/:id
 * Permissions: Admin only
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { name, category, price, foodType, description, isAvailable } = req.body;

    const item = await Menu.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Check duplicate name within the same category
    if (name && category) {
      const duplicate = await Menu.findOne({
        _id: { $ne: req.params.id },
        name: new RegExp(`^${name.trim()}$`, 'i'),
        category,
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Another item named "${name}" already exists in the "${category}" category.`,
        });
      }
    }

    if (name !== undefined) item.name = name.trim();
    if (category !== undefined) item.category = category;
    if (price !== undefined) item.price = Number(price);
    if (foodType !== undefined) item.foodType = foodType;
    if (description !== undefined) item.description = description.trim();
    if (isAvailable !== undefined) item.isAvailable = isAvailable;

    const updatedItem = await item.save();

    return res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Toggle or set menu item availability
 * PATCH /api/menu/:id/availability
 * Permissions: Admin only
 */
const toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;

    const item = await Menu.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    item.isAvailable = isAvailable;
    await item.save();

    return res.status(200).json({
      success: true,
      message: `Menu item "${item.name}" marked as ${
        item.isAvailable ? 'Available' : 'Unavailable'
      }`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Delete a menu item
 * DELETE /api/menu/:id
 * Permissions: Admin only
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const item = await Menu.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Menu item "${item.name}" deleted successfully`,
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
};
