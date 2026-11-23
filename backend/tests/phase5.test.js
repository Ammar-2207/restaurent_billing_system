const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns');

// Configure Google Public DNS for MongoDB Atlas SRV resolution
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
const Table = require('../src/models/table.model');

describe('PHASE 5: Bill History, Search, Filters & Cancellation', () => {
  let server;
  let baseUrl;
  let adminToken;
  let cashierToken;

  // Test artifacts to clean up
  const createdBillIds = [];
  const createdOrderIds = [];

  // Helper to make API requests
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

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 1. Authenticate Admin
    const adminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin', password: 'Admin@123' },
    });
    assert.equal(adminLogin.status, 200, 'Admin login should succeed');
    adminToken = adminLogin.data.token;

    // 2. Authenticate Cashier
    const cashierLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: 'cashier', password: 'Cashier@123' },
    });
    assert.equal(cashierLogin.status, 200, 'Cashier login should succeed');
    cashierToken = cashierLogin.data.token;
  });

  after(async () => {
    // Clean up test bills and orders
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

  // Helper to create an order and generate a bill for testing
  const createTestOrderAndBill = async (options = {}) => {
    // Get an available menu item
    let menuItem = await Menu.findOne({ isAvailable: true });
    if (!menuItem) {
      menuItem = await Menu.create({
        name: 'Test Starter Item',
        category: 'Starters',
        price: 150,
        foodType: 'veg',
        isAvailable: true,
      });
    }

    // Create a running order
    const orderRes = await apiRequest('/orders', {
      method: 'POST',
      token: adminToken,
      body: {
        orderType: options.orderType || 'takeaway',
        items: [{ menuItem: menuItem._id.toString(), quantity: options.quantity || 2 }],
        notes: 'Test order for billing',
      },
    });

    assert.equal(orderRes.status, 201, 'Order creation should succeed');
    const order = orderRes.data.data;
    createdOrderIds.push(order.id || order._id);

    // Generate bill
    const billRes = await apiRequest('/bills', {
      method: 'POST',
      token: adminToken,
      body: {
        orderId: order.id || order._id,
        discountType: options.discountType || 'none',
        discountValue: options.discountValue || 0,
      },
    });

    assert.equal(billRes.status, 201, 'Bill generation should succeed');
    const bill = billRes.data.data;
    createdBillIds.push(bill.id || bill._id);

    // If options specify adding a payment:
    if (options.payment) {
      const payRes = await apiRequest(`/bills/${bill.id || bill._id}/payments`, {
        method: 'POST',
        token: adminToken,
        body: options.payment,
      });
      assert.equal(payRes.status, 200, 'Payment recording should succeed');
      return payRes.data.data;
    }

    return bill;
  };

  // ── TEST 1: Admin can retrieve bill history ──────────────────────────────────
  it('1. Admin can retrieve bill history', async () => {
    const res = await apiRequest('/bills', { method: 'GET', token: adminToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.stats, 'Response must include stats object');
  });

  // ── TEST 2: Cashier can retrieve bill history ────────────────────────────────
  it('2. Cashier can retrieve bill history', async () => {
    const res = await apiRequest('/bills', { method: 'GET', token: cashierToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
  });

  // ── TEST 3: Unauthenticated user cannot retrieve bills (401) ─────────────────
  it('3. Unauthenticated user cannot retrieve bills (401)', async () => {
    const res = await apiRequest('/bills', { method: 'GET' });
    assert.equal(res.status, 401);
    assert.equal(res.data.success, false);
  });

  // ── TEST 4: Search by bill number works ──────────────────────────────────────
  it('4. Search by bill number works', async () => {
    const testBill = await createTestOrderAndBill();
    const res = await apiRequest(`/bills?search=${testBill.billNumber}`, {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.data.length > 0);
    const found = res.data.data.find((b) => b.billNumber === testBill.billNumber);
    assert.ok(found, `Search must return created bill ${testBill.billNumber}`);
  });

  // ── TEST 5: Date range filter works ──────────────────────────────────────────
  it('5. Date range filter works', async () => {
    const testBill = await createTestOrderAndBill();
    const today = new Date().toISOString().split('T')[0];

    const res = await apiRequest(`/bills?startDate=${today}&endDate=${today}`, {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.data.length > 0);
    const found = res.data.data.find((b) => b.billNumber === testBill.billNumber);
    assert.ok(found, 'Bill created today should be in today date range filter');

    // Past range check — should not include today's bill
    const pastRes = await apiRequest('/bills?startDate=2020-01-01&endDate=2020-01-02', {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(pastRes.status, 200);
    assert.equal(pastRes.data.data.length, 0, 'No bills in past date range');
  });

  // ── TEST 6: Payment mode filter works ────────────────────────────────────────
  it('6. Payment mode filter works', async () => {
    // Create bill with UPI payment
    const upiBill = await createTestOrderAndBill({
      payment: { paymentMode: 'upi', amount: 50, referenceNumber: 'UPI-TEST-123' },
    });

    const res = await apiRequest('/bills?paymentMode=upi', {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    const found = res.data.data.find((b) => b.billNumber === upiBill.billNumber);
    assert.ok(found, 'UPI bill should be found when filtering by paymentMode=upi');
  });

  // ── TEST 7: Payment status filter works ──────────────────────────────────────
  it('7. Payment status filter works', async () => {
    // Create unpaid bill
    const unpaidBill = await createTestOrderAndBill();
    assert.equal(unpaidBill.paymentStatus, 'unpaid');

    const res = await apiRequest('/bills?paymentStatus=unpaid', {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    const found = res.data.data.find((b) => b.billNumber === unpaidBill.billNumber);
    assert.ok(found, 'Unpaid bill must be included in paymentStatus=unpaid query');
  });

  // ── TEST 8: Bill status filter works ─────────────────────────────────────────
  it('8. Bill status filter works', async () => {
    const billToCancel = await createTestOrderAndBill();

    // Cancel it as admin
    await apiRequest(`/bills/${billToCancel.id || billToCancel._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Test filter by cancelled status' },
    });

    const res = await apiRequest('/bills?billStatus=cancelled', {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    const found = res.data.data.find((b) => b.billNumber === billToCancel.billNumber);
    assert.ok(found, 'Cancelled bill must be returned when filtering by billStatus=cancelled');
  });

  // ── TEST 9: Pagination returns correct results ───────────────────────────────
  it('9. Pagination returns correct results', async () => {
    const res = await apiRequest('/bills?page=1&limit=2', {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.page, 1);
    assert.equal(res.data.limit, 2);
    assert.ok(res.data.total >= res.data.data.length);
    assert.ok(res.data.totalPages >= 1);
    assert.equal(typeof res.data.hasPrevPage, 'boolean');
    assert.equal(typeof res.data.hasNextPage, 'boolean');
  });

  // ── TEST 10: Admin can view bill details ─────────────────────────────────────
  it('10. Admin can view bill details', async () => {
    const testBill = await createTestOrderAndBill();
    const res = await apiRequest(`/bills/${testBill.id || testBill._id}`, {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.billNumber, testBill.billNumber);
    assert.ok(res.data.data.items.length > 0);
  });

  // ── TEST 11: Cashier can view bill details ───────────────────────────────────
  it('11. Cashier can view bill details', async () => {
    const testBill = await createTestOrderAndBill();
    const res = await apiRequest(`/bills/${testBill.id || testBill._id}`, {
      method: 'GET',
      token: cashierToken,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.billNumber, testBill.billNumber);
  });

  // ── TEST 12: Admin can cancel a bill ─────────────────────────────────────────
  it('12. Admin can cancel a bill', async () => {
    const testBill = await createTestOrderAndBill();
    const res = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Customer requested cancellation before dine-in' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.status, 'cancelled');
    assert.equal(res.data.data.cancellationReason, 'Customer requested cancellation before dine-in');
  });

  // ── TEST 13: Cashier cannot cancel a bill (403 Forbidden) ────────────────────
  it('13. Cashier cannot cancel a bill (403 Forbidden)', async () => {
    const testBill = await createTestOrderAndBill();
    const res = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      token: cashierToken,
      body: { reason: 'Unauthorized cashier attempt' },
    });
    assert.equal(res.status, 403, 'Cashier must be forbidden (403) from cancelling bills');
    assert.equal(res.data.success, false);
  });

  // ── TEST 14: Unauthenticated user cannot cancel a bill (401) ─────────────────
  it('14. Unauthenticated user cannot cancel a bill (401 Unauthorized)', async () => {
    const testBill = await createTestOrderAndBill();
    const res = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      body: { reason: 'Unauthenticated attempt' },
    });
    assert.equal(res.status, 401, 'Unauthenticated user must be 401 Unauthorized');
  });

  // ── TEST 15: Cancellation without a reason is rejected ───────────────────────
  it('15. Cancellation without a reason is rejected (400 Bad Request)', async () => {
    const testBill = await createTestOrderAndBill();

    // Empty body
    const resEmpty = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: {},
    });
    assert.equal(resEmpty.status, 400, 'Empty cancellation body must be 400 Bad Request');

    // Blank string reason
    const resBlank = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: '   ' },
    });
    assert.equal(resBlank.status, 400, 'Blank cancellation reason must be 400 Bad Request');
  });

  // ── TEST 16: Cancellation reason and metadata are saved ──────────────────────
  it('16. Cancellation reason and metadata are saved', async () => {
    const testBill = await createTestOrderAndBill();
    const reasonText = 'Billing mistake: applied wrong discount tier';

    const cancelRes = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: reasonText },
    });
    assert.equal(cancelRes.status, 200);

    // Verify persisted document in DB
    const persistedBill = await Bill.findById(testBill.id || testBill._id).populate('cancelledBy');
    assert.equal(persistedBill.status, 'cancelled');
    assert.equal(persistedBill.cancellationReason, reasonText);
    assert.ok(persistedBill.cancelledAt instanceof Date);
    assert.ok(persistedBill.cancelledBy, 'cancelledBy must be populated');
    assert.equal(persistedBill.cancelledBy.role, 'admin');
  });

  // ── TEST 17: Repeated cancellation is rejected ───────────────────────────────
  it('17. Repeated cancellation is rejected (400 Bad Request)', async () => {
    const testBill = await createTestOrderAndBill();

    // First cancel
    const firstRes = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Initial valid cancellation' },
    });
    assert.equal(firstRes.status, 200);

    // Repeated cancel attempt
    const secondRes = await apiRequest(`/bills/${testBill.id || testBill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Second cancellation attempt' },
    });
    assert.equal(secondRes.status, 400, 'Repeated cancellation must return 400 Bad Request');
    assert.match(secondRes.data.message, /already cancelled/i);
  });

  // ── TEST 18: Cancelled bill payment history remains unchanged ────────────────
  it('18. Cancelled bill payment history remains unchanged', async () => {
    // Create bill with partial payment
    const partialBill = await createTestOrderAndBill({
      payment: { paymentMode: 'card', amount: 100, referenceNumber: 'CARD-TXN-999' },
    });
    assert.equal(partialBill.payments.length, 1);
    assert.equal(partialBill.totalPaid, 100);

    // Cancel the bill
    const cancelRes = await apiRequest(`/bills/${partialBill.id || partialBill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Void transaction requested' },
    });
    assert.equal(cancelRes.status, 200);

    const cancelledBill = cancelRes.data.data;
    assert.equal(cancelledBill.payments.length, 1, 'Payment entries must be preserved');
    assert.equal(cancelledBill.payments[0].paymentMode, 'card');
    assert.equal(cancelledBill.payments[0].amount, 100);
    assert.equal(cancelledBill.payments[0].referenceNumber, 'CARD-TXN-999');
    assert.equal(cancelledBill.totalPaid, 100, 'totalPaid must not be altered');
  });

  // ── TEST 19: Cancelled bills remain visible in bill history ──────────────────
  it('19. Cancelled bills remain visible in bill history', async () => {
    const bill = await createTestOrderAndBill();
    await apiRequest(`/bills/${bill.id || bill._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Audit trail visibility test' },
    });

    const res = await apiRequest('/bills', {
      method: 'GET',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    const found = res.data.data.find((b) => b.billNumber === bill.billNumber);
    assert.ok(found, 'Cancelled bill must remain visible in bills history ledger');
    assert.equal(found.status, 'cancelled');
  });

  // ── TEST 20: Existing billing and payment functionality still works ──────────
  it('20. Existing billing and payment functionality still works', async () => {
    // 1. Create order
    let menuItem = await Menu.findOne({ isAvailable: true });
    assert.ok(menuItem, 'Must have at least one menu item in catalog');

    const orderRes = await apiRequest('/orders', {
      method: 'POST',
      token: adminToken,
      body: {
        orderType: 'takeaway',
        items: [{ menuItem: menuItem._id.toString(), quantity: 1 }],
      },
    });
    assert.equal(orderRes.status, 201);
    const order = orderRes.data.data;
    createdOrderIds.push(order.id || order._id);

    // 2. Generate bill with percentage discount
    const billRes = await apiRequest('/bills', {
      method: 'POST',
      token: cashierToken,
      body: {
        orderId: order.id || order._id,
        discountType: 'percentage',
        discountValue: 10,
      },
    });
    assert.equal(billRes.status, 201);
    const bill = billRes.data.data;
    createdBillIds.push(bill.id || bill._id);

    // Verify GST calculations
    assert.equal(bill.discountType, 'percentage');
    assert.equal(bill.discountValue, 10);
    assert.equal(bill.gstRate, 5);
    assert.equal(bill.cgstRate, 2.5);
    assert.equal(bill.sgstRate, 2.5);
    assert.equal(bill.totalPaid, 0);
    assert.equal(bill.paymentStatus, 'unpaid');

    // 3. Record full payment
    const payRes = await apiRequest(`/bills/${bill.id || bill._id}/payments`, {
      method: 'POST',
      token: cashierToken,
      body: {
        paymentMode: 'cash',
        amount: bill.grandTotal,
        referenceNumber: 'CASH-REC-001',
      },
    });
    assert.equal(payRes.status, 200);
    assert.equal(payRes.data.data.paymentStatus, 'paid');
    assert.equal(payRes.data.data.status, 'completed');
    assert.equal(payRes.data.data.balance, 0);
  });
});
