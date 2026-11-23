const Bill = require('../models/bill.model');
const Order = require('../models/order.model');
const {
  toISTDateString,
  getISTDayRange,
  getISTDateRange,
  getTodayAndYesterdayIST,
  getLastNDaysIST,
} = require('../utils/timezone.util');

// ─────────────────────────────────────────────────────────────
// Helper: Aggregate basic financial totals for a given date range
// ─────────────────────────────────────────────────────────────
const aggregateBillFinancials = async (startUTC, endUTC) => {
  // 1. Billed sales, discounts, taxes, balance (non-cancelled bills only)
  const [salesAgg] = await Bill.aggregate([
    {
      $match: {
        createdAt: { $gte: startUTC, $lte: endUTC },
        status: { $ne: 'cancelled' },
      },
    },
    {
      $group: {
        _id: null,
        totalBilledSales: { $sum: '$grandTotal' },
        totalSubtotal: { $sum: '$subtotal' },
        totalDiscounts: { $sum: '$discountAmount' },
        totalTaxable: { $sum: '$taxableAmount' },
        totalCGST: { $sum: '$cgstAmount' },
        totalSGST: { $sum: '$sgstAmount' },
        totalOutstandingBalance: { $sum: '$balance' },
        totalBills: { $sum: 1 },
      },
    },
  ]);

  // 2. Amount collected by mode (non-cancelled bills only)
  const paymentsAgg = await Bill.aggregate([
    {
      $match: {
        createdAt: { $gte: startUTC, $lte: endUTC },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$payments' },
    {
      $group: {
        _id: '$payments.paymentMode',
        total: { $sum: '$payments.amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  let cashCollected = 0;
  let upiCollected = 0;
  let cardCollected = 0;
  let totalCollected = 0;

  paymentsAgg.forEach((p) => {
    const amt = Number(p.total.toFixed(2));
    totalCollected += amt;
    if (p._id === 'cash') cashCollected = amt;
    if (p._id === 'upi') upiCollected = amt;
    if (p._id === 'card') cardCollected = amt;
  });

  // 3. Bill counts by settlement status
  const [completedBills, partiallyPaidBills, unpaidBills, cancelledBills] = await Promise.all([
    Bill.countDocuments({
      createdAt: { $gte: startUTC, $lte: endUTC },
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' },
    }),
    Bill.countDocuments({
      createdAt: { $gte: startUTC, $lte: endUTC },
      paymentStatus: 'partially_paid',
      status: { $ne: 'cancelled' },
    }),
    Bill.countDocuments({
      createdAt: { $gte: startUTC, $lte: endUTC },
      paymentStatus: 'unpaid',
      status: { $ne: 'cancelled' },
    }),
    Bill.countDocuments({
      createdAt: { $gte: startUTC, $lte: endUTC },
      status: 'cancelled',
    }),
  ]);

  // 4. Order count
  const totalOrders = await Order.countDocuments({
    createdAt: { $gte: startUTC, $lte: endUTC },
  });

  const totalBills = salesAgg?.totalBills || 0;
  const totalBilledSales = Number((salesAgg?.totalBilledSales || 0).toFixed(2));
  const totalOutstandingBalance = Number((salesAgg?.totalOutstandingBalance || 0).toFixed(2));
  const totalSubtotal = Number((salesAgg?.totalSubtotal || 0).toFixed(2));
  const totalDiscounts = Number((salesAgg?.totalDiscounts || 0).toFixed(2));
  const totalCGST = Number((salesAgg?.totalCGST || 0).toFixed(2));
  const totalSGST = Number((salesAgg?.totalSGST || 0).toFixed(2));

  const averageBillValue = totalBills > 0 ? Number((totalBilledSales / totalBills).toFixed(2)) : 0;

  return {
    totalBilledSales,
    totalCollected: Number(totalCollected.toFixed(2)),
    cashCollected,
    upiCollected,
    cardCollected,
    totalOutstandingBalance,
    totalBills,
    completedBills,
    partiallyPaidBills,
    unpaidBills,
    cancelledBills,
    totalOrders,
    averageBillValue,
    totalSubtotal,
    totalDiscounts,
    totalCGST,
    totalSGST,
  };
};

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/dashboard/summary
// Today's KPIs & previous-day comparison
// ─────────────────────────────────────────────────────────────
const getDashboardSummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    let todayRange;
    let yesterdayRange;

    if (date) {
      todayRange = getISTDayRange(date);
      // Calculate previous day in IST
      const [year, month, day] = date.split('-').map(Number);
      const prevDate = new Date(Date.UTC(year, month - 1, day - 1));
      yesterdayRange = getISTDayRange(prevDate.toISOString().slice(0, 10));
    } else {
      const ranges = getTodayAndYesterdayIST();
      todayRange = ranges.today;
      yesterdayRange = ranges.yesterday;
    }

    const [todayStats, yesterdayStats] = await Promise.all([
      aggregateBillFinancials(todayRange.startUTC, todayRange.endUTC),
      aggregateBillFinancials(yesterdayRange.startUTC, yesterdayRange.endUTC),
    ]);

    // Calculate percentage change for Billed Sales
    let salesComparison = {
      percentage: 0,
      direction: 'neutral',
      difference: Number((todayStats.totalBilledSales - yesterdayStats.totalBilledSales).toFixed(2)),
    };

    if (yesterdayStats.totalBilledSales > 0) {
      const diff = todayStats.totalBilledSales - yesterdayStats.totalBilledSales;
      const pct = Number(((diff / yesterdayStats.totalBilledSales) * 100).toFixed(1));
      salesComparison.percentage = Math.abs(pct);
      salesComparison.direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
    } else if (todayStats.totalBilledSales > 0) {
      salesComparison.percentage = 100;
      salesComparison.direction = 'up';
    }

    // Comparison for Amount Collected
    let collectionComparison = {
      percentage: 0,
      direction: 'neutral',
      difference: Number((todayStats.totalCollected - yesterdayStats.totalCollected).toFixed(2)),
    };

    if (yesterdayStats.totalCollected > 0) {
      const diff = todayStats.totalCollected - yesterdayStats.totalCollected;
      const pct = Number(((diff / yesterdayStats.totalCollected) * 100).toFixed(1));
      collectionComparison.percentage = Math.abs(pct);
      collectionComparison.direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
    } else if (todayStats.totalCollected > 0) {
      collectionComparison.percentage = 100;
      collectionComparison.direction = 'up';
    }

    return res.status(200).json({
      success: true,
      data: {
        date: todayRange.dateString,
        timezone: 'Asia/Kolkata',
        kpis: {
          todayBilledSales: todayStats.totalBilledSales,
          todayCollected: todayStats.totalCollected,
          todayOutstandingBalance: todayStats.totalOutstandingBalance,
          todayTotalBills: todayStats.totalBills,
          todayCompletedBills: todayStats.completedBills,
          todayCancelledBills: todayStats.cancelledBills,
          todayOrders: todayStats.totalOrders,
          averageBillValue: todayStats.averageBillValue,
          comparisons: {
            sales: salesComparison,
            collections: collectionComparison,
            yesterdaySales: yesterdayStats.totalBilledSales,
            yesterdayCollected: yesterdayStats.totalCollected,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/dashboard/payment-summary
// Cash, UPI, Card collection breakdowns
// ─────────────────────────────────────────────────────────────
const getPaymentSummary = async (req, res, next) => {
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

    const financials = await aggregateBillFinancials(range.startUTC, range.endUTC);
    const total = financials.totalCollected;

    const breakdown = [
      {
        mode: 'cash',
        label: 'Cash',
        amount: financials.cashCollected,
        percentage: total > 0 ? Number(((financials.cashCollected / total) * 100).toFixed(1)) : 0,
      },
      {
        mode: 'upi',
        label: 'UPI',
        amount: financials.upiCollected,
        percentage: total > 0 ? Number(((financials.upiCollected / total) * 100).toFixed(1)) : 0,
      },
      {
        mode: 'card',
        label: 'Card',
        amount: financials.cardCollected,
        percentage: total > 0 ? Number(((financials.cardCollected / total) * 100).toFixed(1)) : 0,
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        totalCollected: total,
        breakdown,
        dateRange: {
          startDate: range.startDate || range.dateString,
          endDate: range.endDate || range.dateString,
          timezone: 'Asia/Kolkata',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/dashboard/top-items
// Top-selling menu items by quantity sold
// ─────────────────────────────────────────────────────────────
const getTopSellingItems = async (req, res, next) => {
  try {
    const { startDate, endDate, date, limit: queryLimit } = req.query;
    const limit = Math.max(1, Math.min(50, parseInt(queryLimit, 10) || 5));

    let range;
    if (startDate || endDate) {
      range = getISTDateRange(startDate, endDate);
    } else if (date) {
      range = getISTDayRange(date);
    } else {
      const todayStr = toISTDateString();
      range = getISTDayRange(todayStr);
    }

    const topItems = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: range.startUTC, $lte: range.endUTC },
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
      { $sort: { quantitySold: -1, totalSalesAmount: -1 } },
      { $limit: limit },
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

    const totalQuantity = topItems.reduce((sum, item) => sum + item.quantitySold, 0);
    const formatted = topItems.map((item) => ({
      ...item,
      percentageOfTop:
        totalQuantity > 0 ? Number(((item.quantitySold / totalQuantity) * 100).toFixed(1)) : 0,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// Controller: GET /api/dashboard/sales-trend
// Daily sales & collections for last 7 days in Asia/Kolkata
// ─────────────────────────────────────────────────────────────
const getSalesTrend = async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(30, parseInt(req.query.days, 10) || 7));
    const dayRanges = getLastNDaysIST(days);

    const trend = await Promise.all(
      dayRanges.map(async (d) => {
        const stats = await aggregateBillFinancials(d.startUTC, d.endUTC);
        return {
          date: d.date,
          label: d.label,
          billedSales: stats.totalBilledSales,
          amountCollected: stats.totalCollected,
          billCount: stats.totalBills,
          cancelledCount: stats.cancelledBills,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getPaymentSummary,
  getTopSellingItems,
  getSalesTrend,
  aggregateBillFinancials,
};
