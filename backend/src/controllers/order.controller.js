const Order = require('../models/order.model');
const Table = require('../models/table.model');
const { Menu } = require('../models/menu.model');
const { generateOrderNumber } = require('../utils/orderNumber.util');
const mongoose = require('mongoose');

/**
 * Helper: Resolve and validate order items from Menu catalog
 * Builds the frozen price/name/foodType snapshots and calculates lineTotals and subtotal
 * @param {Array} rawItems - [{ menuItem, quantity }]
 * @returns {Promise<{ items: Array, subtotal: number }>}
 */
const buildValidatedOrderItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  const validatedItems = [];
  let subtotal = 0;

  for (const item of rawItems) {
    const quantity = parseInt(item.quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      throw new Error('All item quantities must be integers greater than or equal to 1');
    }

    const menuDoc = await Menu.findById(item.menuItem);
    if (!menuDoc) {
      throw new Error(`Menu item not found in catalog: ${item.menuItem}`);
    }

    if (!menuDoc.isAvailable) {
      throw new Error(`Menu item "${menuDoc.name}" is currently marked as unavailable`);
    }

    // Backend price snapshot ensures prices cannot be spoofed or changed retroactively
    const price = Number(menuDoc.price);
    const lineTotal = Number((price * quantity).toFixed(2));
    subtotal += lineTotal;

    validatedItems.push({
      menuItem: menuDoc._id,
      itemName: menuDoc.name,
      price: price,
      foodType: menuDoc.foodType,
      quantity: quantity,
      lineTotal: lineTotal,
    });
  }

  subtotal = Number(subtotal.toFixed(2));
  return { items: validatedItems, subtotal };
};

/**
 * Controller: Get orders with multi-criteria filtering
 * GET /api/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const { orderType, status, table, date, search } = req.query;

    const filter = {};

    if (orderType && orderType !== 'All') {
      filter.orderType = orderType;
    }

    if (status && status !== 'All') {
      filter.status = status.trim().toLowerCase();
    }

    if (table) {
      if (mongoose.Types.ObjectId.isValid(table)) {
        filter.table = table;
      } else {
        // Query by tableNumber string e.g. 'T1'
        const tableDoc = await Table.findOne({ tableNumber: table.trim().toUpperCase() });
        if (tableDoc) {
          filter.table = tableDoc._id;
        }
      }
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    if (search && search.trim() !== '') {
      filter.orderNumber = { $regex: search.trim(), $options: 'i' };
    }

    const orders = await Order.find(filter)
      .populate('table', 'tableNumber status')
      .populate('createdBy', 'name username role')
      .populate('items.menuItem', 'category')
      .sort({ createdAt: -1 });

    // Compute live dashboard stats
    const [totalCount, runningCount, completedCount, cancelledCount, dineInCount, takeawayCount] =
      await Promise.all([
        Order.countDocuments({}),
        Order.countDocuments({ status: 'running' }),
        Order.countDocuments({ status: 'completed' }),
        Order.countDocuments({ status: 'cancelled' }),
        Order.countDocuments({ orderType: 'dine-in' }),
        Order.countDocuments({ orderType: 'takeaway' }),
      ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
      stats: {
        total: totalCount,
        running: runningCount,
        completed: completedCount,
        cancelled: cancelledCount,
        dineIn: dineInCount,
        takeaway: takeawayCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get single order by ID
 * GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('table', 'tableNumber status')
      .populate('createdBy', 'name username role')
      .populate('items.menuItem', 'category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Create a new order (Dine-In or Takeaway)
 * POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { orderType, table: tableParam, items: rawItems, notes } = req.body;

    let targetTable = null;

    // Handle Dine-In table validations
    if (orderType === 'dine-in') {
      if (!tableParam) {
        return res.status(400).json({
          success: false,
          message: 'Table selection is required for Dine-In orders',
        });
      }

      // Find table by ID or tableNumber
      if (mongoose.Types.ObjectId.isValid(tableParam)) {
        targetTable = await Table.findById(tableParam);
      } else {
        targetTable = await Table.findOne({
          tableNumber: String(tableParam).trim().toUpperCase(),
        });
      }

      if (!targetTable) {
        return res.status(404).json({
          success: false,
          message: `Table "${tableParam}" not found`,
        });
      }

      // Check if table is currently running with an active order
      if (targetTable.status === 'running' && targetTable.currentOrder) {
        const activeOrder = await Order.findById(targetTable.currentOrder);
        if (activeOrder && activeOrder.status === 'running') {
          return res.status(409).json({
            success: false,
            message: `Table ${targetTable.tableNumber} already has an active running order (${activeOrder.orderNumber}). Reopen the existing order to add items.`,
            existingOrder: activeOrder,
          });
        }
      }
    }

    // Validate and build item snapshots
    let validatedData;
    try {
      validatedData = await buildValidatedOrderItems(rawItems);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Generate unique order number with retry on concurrent collision
    let newOrder;
    let orderNumber;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        orderNumber = await generateOrderNumber();
        newOrder = await Order.create({
          orderNumber,
          orderType,
          table: targetTable ? targetTable._id : null,
          items: validatedData.items,
          subtotal: validatedData.subtotal,
          status: 'running',
          notes: notes ? notes.trim() : '',
          createdBy: req.user._id,
        });
        break;
      } catch (err) {
        if (err.code === 11000 && attempt < 2) {
          continue;
        }
        throw err;
      }
    }

    // If Dine-In, atomically update the Table status to 'running'
    if (targetTable) {
      targetTable.status = 'running';
      targetTable.currentOrder = newOrder._id;
      await targetTable.save();
    }

    const populatedOrder = await Order.findById(newOrder._id)
      .populate('table', 'tableNumber status')
      .populate('createdBy', 'name username role');

    return res.status(201).json({
      success: true,
      message: `Order ${orderNumber} created successfully`,
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update full items list or notes of a running order
 * PUT /api/orders/:id
 */
const updateOrder = async (req, res, next) => {
  try {
    const { items: rawItems, notes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Business rule: Completed or cancelled orders cannot be edited
    if (order.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit order. Order is currently marked as "${order.status}". Only running orders can be modified.`,
      });
    }

    if (rawItems && Array.isArray(rawItems)) {
      try {
        const validatedData = await buildValidatedOrderItems(rawItems);
        order.items = validatedData.items;
        order.subtotal = validatedData.subtotal;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    if (notes !== undefined) {
      order.notes = notes.trim();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber status')
      .populate('createdBy', 'name username role');

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} updated successfully`,
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Add or modify items in a running order
 * PATCH /api/orders/:id/items
 */
const updateOrderItems = async (req, res, next) => {
  try {
    const { items: rawItems } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: `Cannot modify items. Order is already "${order.status}".`,
      });
    }

    try {
      const validatedData = await buildValidatedOrderItems(rawItems);
      order.items = validatedData.items;
      order.subtotal = validatedData.subtotal;
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber status')
      .populate('createdBy', 'name username role');

    return res.status(200).json({
      success: true,
      message: 'Order items updated successfully',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update order status (running -> completed / cancelled)
 * Automatically frees the table when completed or cancelled
 * PATCH /api/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status: newStatus } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Business rule: Once completed or cancelled, order status cannot be altered
    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Order ${order.orderNumber} is already "${order.status}". Its status cannot be changed.`,
      });
    }

    order.status = newStatus;
    await order.save();

    // If order was Dine-In and is now completed or cancelled, free the table
    if (order.table && (newStatus === 'completed' || newStatus === 'cancelled')) {
      const table = await Table.findById(order.table);
      if (table) {
        // Only clear if this order was indeed the table's current order
        if (table.currentOrder && table.currentOrder.toString() === order._id.toString()) {
          table.status = 'free';
          table.currentOrder = null;
          await table.save();
        }
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber status')
      .populate('createdBy', 'name username role');

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} marked as ${newStatus}`,
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Delete a single item from a running order
 * DELETE /api/orders/:id/items/:itemId
 */
const deleteOrderItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: `Cannot remove item. Order is already "${order.status}".`,
      });
    }

    // Check if item exists in order
    const itemIndex = order.items.findIndex(
      (i) => i._id.toString() === itemId || i.id === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in order',
      });
    }

    if (order.items.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'An order must have at least one item. Cancel the order instead if you wish to void it.',
      });
    }

    order.items.splice(itemIndex, 1);

    // Recalculate subtotal on backend
    order.subtotal = Number(
      order.items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2)
    );

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber status')
      .populate('createdBy', 'name username role');

    return res.status(200).json({
      success: true,
      message: 'Item removed from order',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderItems,
  updateOrderStatus,
  deleteOrderItem,
};
