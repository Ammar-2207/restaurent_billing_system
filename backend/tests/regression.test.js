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
const Table = require('../src/models/table.model');

describe('REGRESSION TESTS (Phases 1 - 4)', () => {
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

  // ── Phase 1: Auth & RBAC ────────────────────────────────────────────────────
  describe('Phase 1: Authentication & RBAC', () => {
    it('Admin can log in and view profile (/auth/me)', async () => {
      const res = await apiRequest('/auth/me', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.user.role, 'admin');
    });

    it('Cashier can log in and view profile (/auth/me)', async () => {
      const res = await apiRequest('/auth/me', { token: cashierToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.user.role, 'cashier');
    });

    it('Invalid credentials are rejected (401)', async () => {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { identifier: 'admin', password: 'WrongPassword' },
      });
      assert.equal(res.status, 401);
    });

    it('Cashier cannot access admin-only endpoints (e.g. POST /api/menu)', async () => {
      const res = await apiRequest('/menu', {
        method: 'POST',
        token: cashierToken,
        body: {
          name: 'Forbidden Item',
          category: 'Starters',
          price: 100,
          foodType: 'veg',
        },
      });
      assert.equal(res.status, 403);
    });
  });

  // ── Phase 2: Menu Catalog ───────────────────────────────────────────────────
  describe('Phase 2: Menu Catalog Management', () => {
    it('Can fetch menu items with category filter', async () => {
      const res = await apiRequest('/menu?category=Starters', { token: cashierToken });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.data));
    });

    it('Admin can create, update and delete a menu item', async () => {
      const createRes = await apiRequest('/menu', {
        method: 'POST',
        token: adminToken,
        body: {
          name: 'Regression Paneer Special',
          category: 'Main Course',
          price: 260,
          foodType: 'veg',
          description: 'Special test paneer dish',
        },
      });
      assert.equal(createRes.status, 201);
      const itemId = createRes.data.data.id || createRes.data.data._id;

      // Update price
      const updateRes = await apiRequest(`/menu/${itemId}`, {
        method: 'PUT',
        token: adminToken,
        body: { price: 280 },
      });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.data.data.price, 280);

      // Clean up item
      const delRes = await apiRequest(`/menu/${itemId}`, {
        method: 'DELETE',
        token: adminToken,
      });
      assert.equal(delRes.status, 200);
    });
  });

  // ── Phase 3: Tables & Order Management ──────────────────────────────────────
  describe('Phase 3: Tables & Order Management', () => {
    it('10 Tables are seeded and retrievable', async () => {
      const res = await apiRequest('/tables', { token: cashierToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.data.length, 10);
    });

    it('Can create a Dine-In order and verify snapshots and calculations', async () => {
      const menuItem = await Menu.findOne({ isAvailable: true });
      let table = await Table.findOne({ status: 'free' });
      if (!table) {
        table = await Table.findOne();
        table.status = 'free';
        table.currentOrder = null;
        await table.save();
      }

      const res = await apiRequest('/orders', {
        method: 'POST',
        token: cashierToken,
        body: {
          orderType: 'dine-in',
          table: table._id.toString(),
          items: [{ menuItem: menuItem._id.toString(), quantity: 2 }],
        },
      });
      assert.equal(res.status, 201);
      const order = res.data.data;
      createdOrderIds.push(order.id || order._id);

      // Clean up table state
      table.status = 'free';
      table.currentOrder = null;
      await table.save();

      assert.equal(order.items[0].itemName, menuItem.name);
      assert.equal(order.items[0].price, menuItem.price);
      assert.equal(order.items[0].quantity, 2);
      assert.equal(order.subtotal, menuItem.price * 2);
    });
  });

  // ── Phase 4: Billing, GST & Payments ────────────────────────────────────────
  describe('Phase 4: Billing, GST & Payments', () => {
    it('Calculates GST, round-off and generates sequential bill number', async () => {
      const menuItem = await Menu.findOne({ isAvailable: true });
      const orderRes = await apiRequest('/orders', {
        method: 'POST',
        token: cashierToken,
        body: {
          orderType: 'takeaway',
          items: [{ menuItem: menuItem._id.toString(), quantity: 1 }],
        },
      });
      const order = orderRes.data.data;
      createdOrderIds.push(order.id || order._id);

      const billRes = await apiRequest('/bills', {
        method: 'POST',
        token: cashierToken,
        body: { orderId: order.id || order._id },
      });
      assert.equal(billRes.status, 201);
      const bill = billRes.data.data;
      createdBillIds.push(bill.id || bill._id);

      assert.match(bill.billNumber, /^BILL-\d{8}-\d{4}$/);
      assert.equal(bill.gstRate, 5);
      assert.equal(bill.cgstRate, 2.5);
      assert.equal(bill.sgstRate, 2.5);
      assert.equal(bill.subtotal, menuItem.price);
      assert.equal(bill.grandTotal, Math.round(bill.totalBeforeRoundOff));
    });
  });
});
