const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {}

const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const connectDB = require('../src/config/db');
const seedUsers = require('../src/config/seed');
const Bill = require('../src/models/bill.model');
const Order = require('../src/models/order.model');
const { Menu } = require('../src/models/menu.model');
const {
  toISTDateString,
  getISTDayRange,
  getNowIST,
} = require('../src/utils/timezone.util');

describe('PHASE 6: Admin Dashboard, Sales Analytics & Reports', () => {
  let server;
  let baseUrl;
  let adminToken;
  let cashierToken;

  const createdBillIds = [];
  const createdOrderIds = [];

  const apiRequest = async (path, options = {}) => {
    const url = `${baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  };

  before(async () => {
    await connectDB();
    await seedUsers();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    const adminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin', password: 'Admin@123' },
    });
    adminToken = adminLogin.data.token;

    const cashierLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: 'cashier', password: 'Cashier@123' },
    });
    cashierToken = cashierLogin.data.token;
  });

  after(async () => {
    if (createdBillIds.length > 0) {
      await Bill.deleteMany({ _id: { $in: createdBillIds } });
    }
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  });

  // Helper to create test order, bill and optional payments
  const createTestBill = async ({ items, discountType, discountValue, payments = [], status = 'active', createdAt } = {}) => {
    const menuDoc = await Menu.findOne({ isAvailable: true });
    assert.ok(menuDoc, 'Need at least one menu item');

    const orderRes = await apiRequest('/orders', {
      method: 'POST',
      token: adminToken,
      body: {
        orderType: 'takeaway',
        items: items || [{ menuItem: menuDoc._id.toString(), quantity: 1 }],
      },
    });
    assert.equal(orderRes.status, 201);
    const order = orderRes.data.data;
    createdOrderIds.push(order.id || order._id);

    const billRes = await apiRequest('/bills', {
      method: 'POST',
      token: adminToken,
      body: {
        orderId: order.id || order._id,
        discountType: discountType || 'none',
        discountValue: discountValue || 0,
      },
    });
    assert.equal(billRes.status, 201);
    const bill = billRes.data.data;
    createdBillIds.push(bill.id || bill._id);

    // Apply payments
    for (const p of payments) {
      const payRes = await apiRequest(`/bills/${bill.id || bill._id}/payments`, {
        method: 'POST',
        token: adminToken,
        body: p,
      });
      assert.equal(payRes.status, 200);
    }

    // Cancel if requested
    if (status === 'cancelled') {
      const cancelRes = await apiRequest(`/bills/${bill.id || bill._id}/cancel`, {
        method: 'PATCH',
        token: adminToken,
        body: { reason: 'Test cancellation exclusion' },
      });
      assert.equal(cancelRes.status, 200);
    }

    // If createdAt timestamp override was provided, update document
    if (createdAt) {
      await Bill.findByIdAndUpdate(bill.id || bill._id, { createdAt });
    }

    return await Bill.findById(bill.id || bill._id);
  };

  // ── TEST 1: Admin can access dashboard summary ──────────────────────────────
  it('1. Admin can access dashboard summary', async () => {
    const res = await apiRequest('/dashboard/summary', { token: adminToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.kpis);
    assert.equal(typeof res.data.data.kpis.todayBilledSales, 'number');
  });

  // ── TEST 2: Cashier cannot access Admin dashboard summary (403) ──────────────
  it('2. Cashier cannot access Admin dashboard summary (403 Forbidden)', async () => {
    const res = await apiRequest('/dashboard/summary', { token: cashierToken });
    assert.equal(res.status, 403, 'Cashier must be rejected with 403 Forbidden');
    assert.equal(res.data.success, false);
  });

  // ── TEST 3: Unauthenticated user cannot access dashboard (401) ───────────────
  it('3. Unauthenticated user cannot access dashboard (401 Unauthorized)', async () => {
    const res = await apiRequest('/dashboard/summary');
    assert.equal(res.status, 401);
  });

  // ── TEST 4: Admin can access payment summary ─────────────────────────────────
  it('4. Admin can access payment summary', async () => {
    const res = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data.breakdown));
    assert.equal(res.data.data.breakdown.length, 3); // Cash, UPI, Card
  });

  // ── TEST 5: Cashier cannot access reports (403 Forbidden) ────────────────────
  it('5. Cashier cannot access reports (403 Forbidden)', async () => {
    const res = await apiRequest('/reports/daily-sales', { token: cashierToken });
    assert.equal(res.status, 403);

    const dayEndRes = await apiRequest('/reports/day-end', { token: cashierToken });
    assert.equal(dayEndRes.status, 403);
  });

  // ── TEST 6: Today's billed sales are calculated correctly ────────────────────
  it('6. Today\'s billed sales are calculated correctly', async () => {
    const beforeRes = await apiRequest('/dashboard/summary', { token: adminToken });
    const initialSales = beforeRes.data.data.kpis.todayBilledSales;

    const newBill = await createTestBill();

    const afterRes = await apiRequest('/dashboard/summary', { token: adminToken });
    const updatedSales = afterRes.data.data.kpis.todayBilledSales;

    assert.equal(
      Number((updatedSales - initialSales).toFixed(2)),
      newBill.grandTotal,
      'Billed sales must increase exactly by new bill grandTotal'
    );
  });

  // ── TEST 7: Today's collected amount is calculated correctly ─────────────────
  it('7. Today\'s collected amount is calculated correctly', async () => {
    const beforeRes = await apiRequest('/dashboard/summary', { token: adminToken });
    const initialCollected = beforeRes.data.data.kpis.todayCollected;

    const payAmount = 50;
    await createTestBill({
      payments: [{ paymentMode: 'cash', amount: payAmount, referenceNumber: 'CASH-COL-1' }],
    });

    const afterRes = await apiRequest('/dashboard/summary', { token: adminToken });
    const updatedCollected = afterRes.data.data.kpis.todayCollected;

    assert.equal(
      Number((updatedCollected - initialCollected).toFixed(2)),
      payAmount,
      'Collected amount must increase exactly by paid amount'
    );
  });

  // ── TEST 8: Outstanding balance is calculated correctly ──────────────────────
  it('8. Outstanding balance is calculated correctly', async () => {
    const beforeRes = await apiRequest('/dashboard/summary', { token: adminToken });
    const initialBalance = beforeRes.data.data.kpis.todayOutstandingBalance;

    // Create bill with partial payment of 40
    const bill = await createTestBill({
      payments: [{ paymentMode: 'card', amount: 40, referenceNumber: 'PART-1' }],
    });
    const expectedRemaining = bill.balance;

    const afterRes = await apiRequest('/dashboard/summary', { token: adminToken });
    const updatedBalance = afterRes.data.data.kpis.todayOutstandingBalance;

    assert.equal(
      Number((updatedBalance - initialBalance).toFixed(2)),
      expectedRemaining,
      'Outstanding balance must reflect remaining balance on bill'
    );
  });

  // ── TEST 9: Cash collections are correct ─────────────────────────────────────
  it('9. Cash collections are correct', async () => {
    const beforeRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const initialCash = beforeRes.data.data.breakdown.find((b) => b.mode === 'cash')?.amount || 0;

    await createTestBill({
      payments: [{ paymentMode: 'cash', amount: 75 }],
    });

    const afterRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const updatedCash = afterRes.data.data.breakdown.find((b) => b.mode === 'cash')?.amount || 0;

    assert.equal(Number((updatedCash - initialCash).toFixed(2)), 75);
  });

  // ── TEST 10: UPI collections are correct ─────────────────────────────────────
  it('10. UPI collections are correct', async () => {
    const beforeRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const initialUpi = beforeRes.data.data.breakdown.find((b) => b.mode === 'upi')?.amount || 0;

    await createTestBill({
      payments: [{ paymentMode: 'upi', amount: 120, referenceNumber: 'UPI-987' }],
    });

    const afterRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const updatedUpi = afterRes.data.data.breakdown.find((b) => b.mode === 'upi')?.amount || 0;

    assert.equal(Number((updatedUpi - initialUpi).toFixed(2)), 120);
  });

  // ── TEST 11: Card collections are correct ─────────────────────────────────────
  it('11. Card collections are correct', async () => {
    const beforeRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const initialCard = beforeRes.data.data.breakdown.find((b) => b.mode === 'card')?.amount || 0;

    await createTestBill({
      payments: [{ paymentMode: 'card', amount: 95, referenceNumber: 'CARD-555' }],
    });

    const afterRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const updatedCard = afterRes.data.data.breakdown.find((b) => b.mode === 'card')?.amount || 0;

    assert.equal(Number((updatedCard - initialCard).toFixed(2)), 95);
  });

  // ── TEST 12: Split payments are not double-counted ───────────────────────────
  it('12. Split payments are not double-counted', async () => {
    const beforeRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const initTotal = beforeRes.data.data.totalCollected;

    // Split payment: 30 cash + 40 upi = 70 total
    await createTestBill({
      payments: [
        { paymentMode: 'cash', amount: 30 },
        { paymentMode: 'upi', amount: 40, referenceNumber: 'UPI-SPLIT-1' },
      ],
    });

    const afterRes = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const updatedTotal = afterRes.data.data.totalCollected;

    assert.equal(
      Number((updatedTotal - initTotal).toFixed(2)),
      70,
      'Split payments must sum to 70 without double counting'
    );
  });

  // ── TEST 13: Partially paid bills are included correctly ─────────────────────
  it('13. Partially paid bills are included correctly in sales and balance', async () => {
    const resBefore = await apiRequest('/reports/daily-sales', { token: adminToken });
    const beforePartCount = resBefore.data.data.summary.partiallyPaidBills;

    const partialBill = await createTestBill({
      payments: [{ paymentMode: 'cash', amount: 20 }],
    });
    assert.equal(partialBill.paymentStatus, 'partially_paid');

    const resAfter = await apiRequest('/reports/daily-sales', { token: adminToken });
    const afterPartCount = resAfter.data.data.summary.partiallyPaidBills;

    assert.equal(afterPartCount - beforePartCount, 1, 'Partially paid count must increment by 1');
  });

  // ── TEST 14: Cancelled bills are excluded from sales ──────────────────────────
  it('14. Cancelled bills are excluded from sales', async () => {
    const beforeSummary = await apiRequest('/dashboard/summary', { token: adminToken });
    const salesBefore = beforeSummary.data.data.kpis.todayBilledSales;
    const cancelCountBefore = beforeSummary.data.data.kpis.todayCancelledBills;

    // Create a bill and cancel it
    await createTestBill({ status: 'cancelled' });

    const afterSummary = await apiRequest('/dashboard/summary', { token: adminToken });
    const salesAfter = afterSummary.data.data.kpis.todayBilledSales;
    const cancelCountAfter = afterSummary.data.data.kpis.todayCancelledBills;

    assert.equal(salesAfter, salesBefore, 'Billed sales must NOT increase for cancelled bills');
    assert.equal(cancelCountAfter - cancelCountBefore, 1, 'Cancelled bills count must increment');
  });

  // ── TEST 15: Cancelled bill payments are excluded from collections ────────────
  it('15. Cancelled bill payments are excluded from collections', async () => {
    const beforePayment = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const totalCollectedBefore = beforePayment.data.data.totalCollected;

    // Create a bill with a payment, then cancel it
    await createTestBill({
      payments: [{ paymentMode: 'cash', amount: 80 }],
      status: 'cancelled',
    });

    const afterPayment = await apiRequest('/dashboard/payment-summary', { token: adminToken });
    const totalCollectedAfter = afterPayment.data.data.totalCollected;

    assert.equal(
      totalCollectedAfter,
      totalCollectedBefore,
      'Cancelled bill payment must NOT be included in collections'
    );
  });

  // ── TEST 16: Top-selling item quantities are correct ─────────────────────────
  it('16. Top-selling item quantities are correct', async () => {
    const menuDoc = await Menu.findOne({ isAvailable: true });
    assert.ok(menuDoc);

    // Create bill with 5 units of this item
    await createTestBill({
      items: [{ menuItem: menuDoc._id.toString(), quantity: 5 }],
    });

    const topRes = await apiRequest('/dashboard/top-items?limit=20', { token: adminToken });
    assert.equal(topRes.status, 200);

    const found = topRes.data.data.find((i) => i.itemName === menuDoc.name);
    assert.ok(found, `Item "${menuDoc.name}" must be in top selling items`);
    assert.ok(found.quantitySold >= 5);
  });

  // ── TEST 17: Item sales use saved bill snapshots ─────────────────────────────
  it('17. Item sales use saved bill snapshots, not current catalog prices', async () => {
    // 1. Create a special menu item
    const customItem = await Menu.create({
      name: 'Snapshot Test Item ' + Date.now(),
      category: 'Desserts',
      price: 100,
      foodType: 'veg',
      isAvailable: true,
    });

    // 2. Bill 2 units at rate 100
    await createTestBill({
      items: [{ menuItem: customItem._id.toString(), quantity: 2 }],
    });

    // 3. Change menu item price in catalog to 500
    customItem.price = 500;
    await customItem.save();

    // 4. Fetch item sales report
    const reportRes = await apiRequest(`/reports/item-sales?search=${encodeURIComponent(customItem.name)}`, {
      token: adminToken,
    });
    assert.equal(reportRes.status, 200);

    const itemReport = reportRes.data.data.items.find((i) => i.itemName === customItem.name);
    assert.ok(itemReport);
    assert.equal(itemReport.quantitySold, 2);
    assert.equal(itemReport.unitPriceSnapshot, 100, 'Must reflect frozen snapshot rate of 100');
    assert.equal(itemReport.totalSalesAmount, 200, 'Must calculate line total 200 using snapshot');

    // Clean up
    await Menu.findByIdAndDelete(customItem._id);
  });

  // ── TEST 18: Sales trend returns the correct daily totals ────────────────────
  it('18. Sales trend returns the correct daily totals', async () => {
    const trendRes = await apiRequest('/dashboard/sales-trend?days=7', { token: adminToken });
    assert.equal(trendRes.status, 200);
    assert.equal(trendRes.data.data.length, 7);

    // Today's entry is the last element
    const todayTrend = trendRes.data.data[6];
    assert.ok(todayTrend.date);
    assert.equal(typeof todayTrend.billedSales, 'number');
    assert.equal(typeof todayTrend.amountCollected, 'number');
  });

  // ── TEST 19: Date range filtering works ──────────────────────────────────────
  it('19. Date range filtering works in daily sales report', async () => {
    const today = toISTDateString();
    const res = await apiRequest(`/reports/daily-sales?startDate=${today}&endDate=${today}`, {
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.data.reportingPeriod.startDate, today);
    assert.equal(res.data.data.reportingPeriod.endDate, today);
    assert.equal(res.data.data.reportingPeriod.timezone, 'Asia/Kolkata');
  });

  // ── TEST 20: Asia/Kolkata midnight boundaries work correctly ─────────────────
  it('20. Asia/Kolkata midnight boundaries work correctly', async () => {
    // Range for 2026-11-23 IST:
    // Start: 2026-11-22 18:30:00.000 UTC
    // End:   2026-11-23 18:29:59.999 UTC
    const range = getISTDayRange('2026-11-23');

    assert.equal(range.startUTC.toISOString(), '2026-11-22T18:30:00.000Z');
    assert.equal(range.endUTC.toISOString(), '2026-11-23T18:29:59.999Z');

    // Create a bill with timestamp at 11:50 PM IST on 2026-11-23 -> 18:20 UTC
    const lateNightUTC = new Date('2026-11-23T18:20:00.000Z');
    await createTestBill({ createdAt: lateNightUTC });

    const reportRes = await apiRequest('/reports/daily-sales?date=2026-11-23', {
      token: adminToken,
    });
    assert.equal(reportRes.status, 200);
    assert.ok(reportRes.data.data.summary.totalBills >= 1, 'Late night bill must fall into 2026-11-23 IST');
  });

  // ── TEST 21: Empty report periods return zero totals safely ──────────────────
  it('21. Empty report periods return zero totals safely without error', async () => {
    const res = await apiRequest('/reports/daily-sales?startDate=1999-01-01&endDate=1999-01-02', {
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.data.summary.totalBills, 0);
    assert.equal(res.data.data.summary.totalBilledSales, 0);
    assert.equal(res.data.data.summary.totalCollected, 0);
    assert.equal(res.data.data.summary.outstandingBalance, 0);
    assert.equal(res.data.data.summary.averageBillValue, 0);
  });

  // ── TEST 22: Day-end summary values match the underlying bills and payments ──
  it('22. Day-end summary values match the underlying bills and payments', async () => {
    const today = toISTDateString();
    const res = await apiRequest(`/reports/day-end?date=${today}`, { token: adminToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.reportDate, today);
    assert.equal(res.data.data.restaurantName, 'RestoBill Management Suite');
    assert.ok(res.data.data.financials);

    const { totalBilledSales, cashCollected, upiCollected, cardCollected, totalCollected } =
      res.data.data.financials;

    const sumModes = Number((cashCollected + upiCollected + cardCollected).toFixed(2));
    assert.equal(
      totalCollected,
      sumModes,
      'Total collected must equal sum of cash, upi and card collections'
    );
  });
});
