const Table = require('../models/table.model');

/**
 * Controller: Get all 10 tables with their current active order details
 * GET /api/tables
 */
const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find()
      .populate({
        path: 'currentOrder',
        select: 'orderNumber orderType items subtotal status createdAt',
      })
      .sort({ tableNumber: 1 });

    // Self-heal: If table is marked running but has no active running order, free it
    for (const table of tables) {
      if (
        table.status === 'running' &&
        (!table.currentOrder || table.currentOrder.status !== 'running')
      ) {
        table.status = 'free';
        table.currentOrder = null;
        await Table.updateOne(
          { _id: table._id },
          { status: 'free', currentOrder: null }
        );
      }
    }

    // Ensure custom sort order: T1, T2, ... T10
    tables.sort((a, b) => {
      const numA = parseInt(a.tableNumber.replace('T', ''), 10);
      const numB = parseInt(b.tableNumber.replace('T', ''), 10);
      return numA - numB;
    });

    const total = tables.length;
    const free = tables.filter((t) => t.status === 'free').length;
    const running = tables.filter((t) => t.status === 'running').length;

    return res.status(200).json({
      success: true,
      count: total,
      data: tables,
      stats: {
        total,
        free,
        running,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get single table by ID with current order
 * GET /api/tables/:id
 */
const getTableById = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id).populate({
      path: 'currentOrder',
      populate: { path: 'createdBy', select: 'name username role' },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTables,
  getTableById,
};
