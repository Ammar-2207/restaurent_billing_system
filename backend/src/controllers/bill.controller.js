const Bill = require('../models/bill.model');
const Order = require('../models/order.model');
const Table = require('../models/table.model');
const { generateBillNumber } = require('../utils/billNumber.util');

// ─────────────────────────────────────────────
// Helper: Compute all financial figures server-side
// ─────────────────────────────────────────────
const computeBillFinancials = (orderItems, discountType = 'none', discountValue = 0) => {
  // 1. Subtotal from order item snapshots
  const subtotal = Number(
    orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );

  // 2. Discount calculation
  let discountAmount = 0;
  if (discountType === 'percentage') {
    if (discountValue < 0 || discountValue > 100) {
      throw new Error('Percentage discount must be between 0 and 100');
    }
    discountAmount = Number(((subtotal * discountValue) / 100).toFixed(2));
  } else if (discountType === 'fixed') {
    if (discountValue > subtotal) {
      throw new Error(`Fixed discount (₹${discountValue}) cannot exceed subtotal (₹${subtotal})`);
    }
    discountAmount = Number(discountValue.toFixed(2));
  }

  if (discountAmount < 0) {
    throw new Error('Discount cannot result in a negative amount');
  }

  // 3. Taxable amount (after discount)
  const taxableAmount = Number((subtotal - discountAmount).toFixed(2));

  if (taxableAmount < 0) {
    throw new Error('Taxable amount cannot be negative. Discount exceeds subtotal.');
  }

  // 4. GST components (5% total = 2.5% CGST + 2.5% SGST)
  const cgstRate = 2.5;
  const sgstRate = 2.5;
  const gstRate = cgstRate + sgstRate;

  const cgstAmount = Number(((taxableAmount * cgstRate) / 100).toFixed(2));
  const sgstAmount = Number(((taxableAmount * sgstRate) / 100).toFixed(2));

  // 5. Total before rounding
  const totalBeforeRoundOff = Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));

  // 6. Round-off (nearest rupee)
  const grandTotal = Math.round(totalBeforeRoundOff);
  const roundOff = Number((grandTotal - totalBeforeRoundOff).toFixed(2));

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    gstRate,
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    totalBeforeRoundOff,
    roundOff,
    grandTotal,
  };
};

// ─────────────────────────────────────────────
// Controller: Generate a Bill for an Order
// POST /api/bills
// ─────────────────────────────────────────────
const createBill = async (req, res, next) => {
  try {
    const { orderId, discountType = 'none', discountValue = 0 } = req.body;

    // 1. Fetch the order
    const order = await Order.findById(orderId).populate('table', 'tableNumber status');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 2. Order must be running and have items
    if (order.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: `Cannot generate bill. Order is currently "${order.status}". Only running orders can be billed.`,
      });
    }

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order has no items to bill' });
    }

    // 3. Check for existing bill (prevent duplicates — unique index enforces at DB level too)
    const existingBill = await Bill.findOne({ order: orderId });
    if (existingBill) {
      return res.status(409).json({
        success: false,
        message: `A bill already exists for this order: ${existingBill.billNumber}`,
        data: existingBill,
      });
    }

    // 4. Compute all financial figures on the backend
    let financials;
    try {
      financials = computeBillFinancials(
        order.items,
        discountType,
        parseFloat(discountValue) || 0
      );
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // 5. Build frozen item snapshots from the order
    const billItems = order.items.map((item) => ({
      menuItem: item.menuItem,
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      foodType: item.foodType,
      lineTotal: item.lineTotal,
    }));

    // 6. Generate unique bill number (atomic counter)
    const billNumber = await generateBillNumber();

    // 7. Determine table number snapshot
    const tableNumber = order.table ? order.table.tableNumber : null;

    // 8. Create the bill
    const bill = await Bill.create({
      billNumber,
      order: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber,
      cashier: req.user._id,
      cashierName: req.user.name,
      items: billItems,
      ...financials,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      payments: [],
      totalPaid: 0,
      balance: financials.grandTotal,
      paymentStatus: 'unpaid',
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: `Bill ${billNumber} generated successfully`,
      data: bill,
    });
  } catch (error) {
    // Handle unique constraint violation (concurrent duplicate)
    if (error.code === 11000) {
      const existingBill = await Bill.findOne({ order: req.body.orderId });
      return res.status(409).json({
        success: false,
        message: `A bill was already created for this order concurrently: ${existingBill?.billNumber}`,
        data: existingBill,
      });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────
// Controller: Get Bill by ID
// GET /api/bills/:id
// ─────────────────────────────────────────────
const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('cashier', 'name username role')
      .populate('cancelledBy', 'name username role')
      .populate('order', 'orderNumber orderType status notes');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    return res.status(200).json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// Controller: Get Bill by Order ID
// GET /api/bills/order/:orderId
// ─────────────────────────────────────────────
const getBillByOrderId = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ order: req.params.orderId })
      .populate('cashier', 'name username role')
      .populate('cancelledBy', 'name username role')
      .populate('order', 'orderNumber orderType status notes');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'No bill found for this order' });
    }

    return res.status(200).json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// Controller: Get all Bills (with search, filters, pagination)
// GET /api/bills
// ─────────────────────────────────────────────
const getBills = async (req, res, next) => {
  try {
    const {
      status,
      billStatus,
      paymentStatus,
      paymentMode,
      orderType,
      date,
      startDate,
      endDate,
      search,
      page: queryPage,
      limit: queryLimit,
    } = req.query;

    const filter = {};

    // 1. Bill lifecycle status (support both status and billStatus query params)
    const targetStatus = billStatus || status;
    if (targetStatus && targetStatus !== 'All') {
      filter.status = targetStatus.toLowerCase();
    }

    // 2. Payment status filter
    if (paymentStatus && paymentStatus !== 'All') {
      filter.paymentStatus = paymentStatus.toLowerCase();
    }

    // 3. Payment mode filter (matching payments array)
    if (paymentMode && paymentMode !== 'All') {
      filter['payments.paymentMode'] = paymentMode.toLowerCase();
    }

    // 4. Order type filter
    if (orderType && orderType !== 'All') {
      filter.orderType = orderType.toLowerCase();
    }

    // 5. Date filters (range or single date)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $lte: end };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    // 6. Search across billNumber, orderNumber, tableNumber, cashierName
    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { billNumber: { $regex: term, $options: 'i' } },
        { orderNumber: { $regex: term, $options: 'i' } },
        { tableNumber: { $regex: term, $options: 'i' } },
        { cashierName: { $regex: term, $options: 'i' } },
      ];
    }

    // 7. Pagination
    const page = Math.max(1, parseInt(queryPage, 10) || 1);
    const limit = queryLimit ? Math.max(1, Math.min(100, parseInt(queryLimit, 10) || 10)) : 10;
    const skip = (page - 1) * limit;

    const [totalCount, bills] = await Promise.all([
      Bill.countDocuments(filter),
      Bill.find(filter)
        .populate('cashier', 'name username role')
        .populate('cancelledBy', 'name username role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    // 8. Stats for top KPI cards
    const [total, paid, partiallyPaid, unpaid, completed, cancelled] = await Promise.all([
      Bill.countDocuments({}),
      Bill.countDocuments({ paymentStatus: 'paid', status: { $ne: 'cancelled' } }),
      Bill.countDocuments({ paymentStatus: 'partially_paid', status: { $ne: 'cancelled' } }),
      Bill.countDocuments({ paymentStatus: 'unpaid', status: { $ne: 'cancelled' } }),
      Bill.countDocuments({ status: 'completed' }),
      Bill.countDocuments({ status: 'cancelled' }),
    ]);

    return res.status(200).json({
      success: true,
      count: bills.length,
      total: totalCount,
      page,
      totalPages,
      limit,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      data: bills,
      stats: { total, paid, partiallyPaid, unpaid, completed, cancelled },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// Controller: Add Payment to Bill
// POST /api/bills/:id/payments
// ─────────────────────────────────────────────
const addPayment = async (req, res, next) => {
  try {
    const { paymentMode, amount, referenceNumber = '' } = req.body;
    const paymentAmount = Number(parseFloat(amount).toFixed(2));

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Cannot add payments to cancelled or already-paid bill
    if (bill.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot add payment to a cancelled bill' });
    }

    if (bill.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Bill is already fully paid' });
    }

    // Overpayment guard
    const currentBalance = Number((bill.grandTotal - bill.totalPaid).toFixed(2));
    if (paymentAmount > currentBalance + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ₹${paymentAmount} exceeds outstanding balance ₹${currentBalance}`,
      });
    }

    // Add the payment entry
    bill.payments.push({
      paymentMode,
      amount: paymentAmount,
      referenceNumber: referenceNumber.trim(),
    });

    // Recalculate totals
    const totalPaid = Number(
      bill.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)
    );
    bill.totalPaid = totalPaid;
    bill.balance = Number((bill.grandTotal - totalPaid).toFixed(2));

    // Determine payment status
    if (totalPaid >= bill.grandTotal - 0.01) {
      // Fully paid (allow for floating-point tolerance of 1 paisa)
      bill.paymentStatus = 'paid';
      bill.status = 'completed';
      bill.balance = 0;
      bill.totalPaid = bill.grandTotal; // Normalize

      // Mark the linked order as completed & free table
      const order = await Order.findById(bill.order).populate('table');
      if (order && order.status === 'running') {
        order.status = 'completed';
        await order.save();

        if (order.table) {
          const table = await Table.findById(order.table._id || order.table);
          if (table && table.currentOrder && table.currentOrder.toString() === order._id.toString()) {
            table.status = 'free';
            table.currentOrder = null;
            await table.save();
          }
        }
      }
    } else {
      bill.paymentStatus = 'partially_paid';
    }

    await bill.save();

    const populatedBill = await Bill.findById(bill._id)
      .populate('cashier', 'name username role')
      .populate('order', 'orderNumber status');

    return res.status(200).json({
      success: true,
      message: bill.paymentStatus === 'paid'
        ? 'Payment complete! Bill settled and order closed.'
        : `Payment of ₹${paymentAmount} recorded. Balance remaining: ₹${bill.balance}`,
      data: populatedBill,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// Controller: Cancel a Bill (Admin Only)
// PATCH /api/bills/:id/cancel
// ─────────────────────────────────────────────
const cancelBill = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
    }

    // Prevent double cancellation
    if (bill.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Bill ${bill.billNumber} is already cancelled`,
      });
    }

    // Apply cancellation metadata
    bill.status = 'cancelled';
    bill.cancelledBy = req.user._id;
    bill.cancelledAt = new Date();
    bill.cancellationReason = reason.trim();

    // Note on financial policy:
    // Existing payments, item snapshots, and totals are preserved for audit trail.
    // No automatic gateway/cash refund is simulated. Orders and tables are not reversed.
    await bill.save();

    const populatedBill = await Bill.findById(bill._id)
      .populate('cashier', 'name username role')
      .populate('cancelledBy', 'name username role')
      .populate('order', 'orderNumber orderType status notes');

    return res.status(200).json({
      success: true,
      message: `Bill ${bill.billNumber} cancelled successfully`,
      data: populatedBill,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBill,
  getBillById,
  getBillByOrderId,
  getBills,
  addPayment,
  cancelBill,
};
