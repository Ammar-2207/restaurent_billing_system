const Bill = require('../models/bill.model');
const Order = require('../models/order.model');
const {
  toISTDateString,
  getISTDayRange,
  getISTDateRange,
} = require('../utils/timezone.util');
const { aggregateBillFinancials } = require('./dashboard.controller');

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/reports/daily-sales
// Daily sales & collections summary for a date or date range
// ─────────────────────────────────────────────────────────────
const getDailySalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, date } = req.query;
    let range;

    if (startDate || endDate) {
      range = getISTDateRange(startDate, endDate);
    } else if (date) {
      range = getISTDayRange(date);
    } else {
      const todayStr = toISTDateString();
      range = getISTDayRange(todayStr);
    }

    const summary = await aggregateBillFinancials(range.startUTC, range.endUTC);

    return res.status(200).json({
      success: true,
      data: {
        reportingPeriod: {
          startDate: range.startDate || range.dateString,
          endDate: range.endDate || range.dateString,
          timezone: 'Asia/Kolkata',
        },
        summary: {
          totalBills: summary.totalBills,
          completedBills: summary.completedBills,
          partiallyPaidBills: summary.partiallyPaidBills,
          unpaidBills: summary.unpaidBills,
          cancelledBills: summary.cancelledBills,
          totalOrders: summary.totalOrders,
          totalSubtotal: summary.totalSubtotal,
          totalDiscounts: summary.totalDiscounts,
          totalCGST: summary.totalCGST,
          totalSGST: summary.totalSGST,
          totalBilledSales: summary.totalBilledSales,
          totalCollected: summary.totalCollected,
          outstandingBalance: summary.totalOutstandingBalance,
          averageBillValue: summary.averageBillValue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/reports/payment-summary
// Payment mode collections breakdown (Cash, UPI, Card)
// ─────────────────────────────────────────────────────────────
const getPaymentReport = async (req, res, next) => {
  try {
    const { startDate, endDate, date } = req.query;
    let range;

    if (startDate || endDate) {
      range = getISTDateRange(startDate, endDate);
    } else if (date) {
      range = getISTDayRange(date);
    } else {
      const todayStr = toISTDateString();
      range = getISTDayRange(todayStr);
    }

    const summary = await aggregateBillFinancials(range.startUTC, range.endUTC);

    // Get individual transaction counts per payment mode
    const modeCounts = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: range.startUTC, $lte: range.endUTC },
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.paymentMode',
          count: { $sum: 1 },
          amount: { $sum: '$payments.amount' },
        },
      },
    ]);

    const countsMap = {};
    modeCounts.forEach((m) => {
      countsMap[m._id] = { count: m.count, amount: Number(m.amount.toFixed(2)) };
    });

    const total = summary.totalCollected;

    const modes = ['cash', 'upi', 'card'].map((mode) => {
      const amount = countsMap[mode]?.amount || 0;
      const count = countsMap[mode]?.count || 0;
      return {
        mode,
        label: mode === 'cash' ? 'Cash' : mode === 'upi' ? 'UPI' : 'Card',
        amount,
        count,
        percentage: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        reportingPeriod: {
          startDate: range.startDate || range.dateString,
          endDate: range.endDate || range.dateString,
          timezone: 'Asia/Kolkata',
        },
        totalCollected: total,
        modes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/reports/item-sales
// Item-wise sales report with quantity and total sales amounts
// ─────────────────────────────────────────────────────────────
const getItemSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, date, sortBy = 'quantity', search } = req.query;
    let range;

    if (startDate || endDate) {
      range = getISTDateRange(startDate, endDate);
    } else if (date) {
      range = getISTDayRange(date);
    } else {
      const todayStr = toISTDateString();
      range = getISTDayRange(todayStr);
    }

    const matchStage = {
      createdAt: { $gte: range.startUTC, $lte: range.endUTC },
      status: { $ne: 'cancelled' },
    };

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemName',
          quantitySold: { $sum: '$items.quantity' },
          totalSalesAmount: { $sum: '$items.lineTotal' },
          foodType: { $first: '$items.foodType' },
          unitPriceSnapshot: { $first: '$items.price' },
        },
      },
    ];

    if (search && search.trim()) {
      pipeline.push({
        $match: {
          _id: { $regex: search.trim(), $options: 'i' },
        },
      });
    }

    const sortOrder = sortBy === 'amount' ? { totalSalesAmount: -1 } : { quantitySold: -1 };
    pipeline.push({ $sort: sortOrder });

    const items = await Bill.aggregate(pipeline);

    const totalSoldQuantity = items.reduce((sum, i) => sum + i.quantitySold, 0);
    const totalItemSales = Number(
      items.reduce((sum, i) => sum + i.totalSalesAmount, 0).toFixed(2)
    );

    const formattedItems = items.map((item) => ({
      itemName: item._id,
      quantitySold: item.quantitySold,
      totalSalesAmount: Number(item.totalSalesAmount.toFixed(2)),
      foodType: item.foodType,
      unitPriceSnapshot: item.unitPriceSnapshot,
      quantityContribution:
        totalSoldQuantity > 0
          ? Number(((item.quantitySold / totalSoldQuantity) * 100).toFixed(1))
          : 0,
      salesContribution:
        totalItemSales > 0
          ? Number(((item.totalSalesAmount / totalItemSales) * 100).toFixed(1))
          : 0,
    }));

    return res.status(200).json({
      success: true,
      count: formattedItems.length,
      data: {
        reportingPeriod: {
          startDate: range.startDate || range.dateString,
          endDate: range.endDate || range.dateString,
          timezone: 'Asia/Kolkata',
        },
        summary: {
          totalUniqueItems: formattedItems.length,
          totalSoldQuantity,
          totalItemSales,
        },
        items: formattedItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/reports/day-end
// Complete printable day-end summary for a selected date
// ─────────────────────────────────────────────────────────────
const getDayEndReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || toISTDateString();
    const dayRange = getISTDayRange(targetDate);

    // 1. Core financial metrics
    const financials = await aggregateBillFinancials(dayRange.startUTC, dayRange.endUTC);

    // 2. Top 5 selling items for the day
    const topItems = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: dayRange.startUTC, $lte: dayRange.endUTC },
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemName',
          quantitySold: { $sum: '$items.quantity' },
          totalSalesAmount: { $sum: '$items.lineTotal' },
          foodType: { $first: '$items.foodType' },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          itemName: '$_id',
          quantitySold: 1,
          totalSalesAmount: { $round: ['$totalSalesAmount', 2] },
          foodType: 1,
        },
      },
    ]);

    // 3. Cashier-wise breakdown
    const cashierBreakdown = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: dayRange.startUTC, $lte: dayRange.endUTC },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: '$cashierName',
          billsCount: { $sum: 1 },
          billedSales: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$totalPaid' },
        },
      },
      {
        $project: {
          _id: 0,
          cashierName: '$_id',
          billsCount: 1,
          billedSales: { $round: ['$billedSales', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        restaurantName: 'RestoBill Management Suite',
        reportDate: targetDate,
        timezone: 'Asia/Kolkata (IST)',
        generatedAt: new Date().toISOString(),
        financials: {
          totalBills: financials.totalBills,
          completedBills: financials.completedBills,
          partiallyPaidBills: financials.partiallyPaidBills,
          unpaidBills: financials.unpaidBills,
          cancelledBills: financials.cancelledBills,
          totalOrders: financials.totalOrders,
          totalSubtotal: financials.totalSubtotal,
          totalDiscounts: financials.totalDiscounts,
          totalTaxable: Number((financials.totalSubtotal - financials.totalDiscounts).toFixed(2)),
          totalCGST: financials.totalCGST,
          totalSGST: financials.totalSGST,
          totalBilledSales: financials.totalBilledSales,
          cashCollected: financials.cashCollected,
          upiCollected: financials.upiCollected,
          cardCollected: financials.cardCollected,
          totalCollected: financials.totalCollected,
          outstandingBalance: financials.totalOutstandingBalance,
          averageBillValue: financials.averageBillValue,
        },
        topSellingItems: topItems,
        cashierBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailySalesReport,
  getPaymentReport,
  getItemSalesReport,
  getDayEndReport,
};
