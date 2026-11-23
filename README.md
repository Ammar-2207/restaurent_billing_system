# Restaurant Billing Management System

A full-stack, enterprise-grade Restaurant Billing and POS Management application designed with modular architecture, strict separation of concerns, role-based access control, and modern web standards.

---

## 1. Project Overview

The **Restaurant Billing Management System** provides an efficient, modern platform for restaurant operations, covering culinary menu catalog management, point-of-sale (POS) billing, active order processing, role-based access control (Admin & Cashier), and operational analytics.

Structured as a clean, decoupled monorepo containing dedicated `frontend` and `backend` workspaces.

---

## 2. Technology Stack

### Frontend
- **Framework & Tooling:** React.js (v19) with Vite
- **Language:** JavaScript (ES Modules, modern syntax)
- **Styling:** Tailwind CSS v3 with PostCSS and Autoprefixer
- **Routing:** React Router DOM (v7)
- **HTTP Client:** Axios with request & response interceptors
- **State & Context:** React Context API (`AuthContext`)
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Data Visualization:** Recharts
- **Date Utilities:** Date-fns

### Backend
- **Runtime & Framework:** Node.js with Express.js (v5)
- **Database:** MongoDB with Mongoose (v9) ODM
- **Authentication & Security:** JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`
- **Validation & Logging:** `express-validator`, `morgan`
- **Configuration:** `dotenv`
- **Development Tooling:** `nodemon`

---

## 3. Seeded Accounts & Default Credentials

The system automatically initializes and verifies two baseline accounts in MongoDB Atlas upon startup without overwriting existing data:

| Account Role | Username | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@restaurant.com` | `Admin@123` | Full access across all application modules, menu CRUD, and settings |
| **Cashier** | `cashier` | `cashier@restaurant.com` | `Cashier@123` | Read-only access to available menu items, billing, orders, and bill history |

> [!NOTE]
> Passwords are automatically hashed with salted `bcryptjs` (salt rounds: 10) in Mongoose pre-save hooks. Plain-text passwords and password hashes are never exposed in API responses.

---

## 4. Phase 1: Authentication & Role-Based Access Control (RBAC)

- **`POST /api/auth/login`**: Authenticates credentials (`identifier`: username or email, `password`), checks account status (`isActive`), and returns a signed JWT token along with sanitized user info.
- **`GET /api/auth/me`**: Protected endpoint returning the authenticated user's session profile.
- **`POST /api/auth/logout`**: Authenticated session termination endpoint.
- **`GET /api/auth/admin-only`**: Protected RBAC endpoint restricted strictly to `admin` role.
- **`GET /api/auth/cashier-access`**: Protected RBAC endpoint accessible to both `admin` and `cashier` roles.

---

## 5. Phase 2: Menu Management Module

### Menu Data Model (`backend/src/models/menu.model.js`)
Each culinary item contains:
- `name`: String, required, 2-100 characters.
- `category`: Enum (`['Starters', 'Main Course', 'Breads', 'Biryani', 'Beverages', 'Desserts']`).
- `price`: Number in Indian Rupees (₹), non-negative.
- `foodType`: Enum (`['veg', 'non-veg']`) with standard FSSAI compliant visual indicators.
- `description`: String, up to 500 characters.
- `isAvailable`: Boolean, default `true`.
- `timestamps`: `createdAt`, `updatedAt`.
- **Indexes:** Compound index on `{ category: 1, foodType: 1, isAvailable: 1 }` and text index on `{ name: 'text', description: 'text' }`.

### Menu API Endpoints
All endpoints enforce backend JWT authentication and role authorization:

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu` | `admin`, `cashier` | List items with search (`search`), category (`category`), food type (`foodType`), and availability (`isAvailable`) filters. **Cashier requests are strictly constrained by the backend to return available items only (`isAvailable: true`).** |
| `GET` | `/api/menu/:id` | `admin`, `cashier` | Get single menu item. Returns 404 to cashiers if item is currently unavailable. |
| `POST` | `/api/menu` | `admin` | Create a new menu item with category duplicate prevention. |
| `PUT` | `/api/menu/:id` | `admin` | Update menu item details, category, pricing, or description. |
| `PATCH`| `/api/menu/:id/availability` | `admin` | Instant toggle of item availability status (`true` / `false`). |
| `DELETE`| `/api/menu/:id` | `admin` | Permanently remove item from catalog. |

### Database Seeding (`backend/src/config/menuSeed.js`)
The server seeds 24 realistic culinary items across all 6 categories with authentic INR pricing on first startup idempotently (e.g., Paneer Tikka ₹260, Butter Chicken ₹380, Tandoori Roti ₹30, Chicken Dum Biryani ₹350, Fresh Lime Soda ₹70, Gulab Jamun ₹90).

### Frontend Menu Management UI (`/menu`)
- **Summary KPI Cards:** Real-time metrics for total items, available items, unavailable items, and veg / non-veg split.
- **Search & Filter Bar:** Instant keyword search, category pills, food type filter, availability filter, and sorting.
- **Indian FSSAI Indicators:** Clean green dot for Vegetarian and red dot for Non-Vegetarian.
- **Admin Management Suite:** Create item modal, edit item modal, delete confirmation modal, and instant one-click availability toggle.
- **Cashier Safe Mode:** Cashiers view available menu items for reference and search without any creation, modification, or deletion controls.

---

## 6. Phase 3: Table & Order Management

### Table Model (`backend/src/models/table.model.js`)
- `tableNumber`: String, e.g. `T1` through `T10`.
- `status`: Enum (`free`, `running`) — automatically synchronized with active Dine-In orders.
- `currentOrder`: ObjectId reference to active Order (nullable).
- **Seeding:** 10 tables (`T1`–`T10`) seeded idempotently on every backend start via `tableSeed.js`.

### Order Model (`backend/src/models/order.model.js`)
- `orderNumber`: Unique auto-generated identifier (`ORD-YYYYMMDD-XXXX`).
- `orderType`: Enum (`dine-in`, `takeaway`).
- `table`: Nullable reference to Table (required for Dine-In, null for Takeaway).
- `items`: Embedded snapshot array — each item captures `menuItem` ref, `itemName`, `price`, `foodType`, `quantity`, and `lineTotal` **at order placement time**. Existing order prices are immune to future catalog price changes.
- `subtotal`: Computed and validated server-side. Frontend-provided values are never trusted.
- `status`: Enum (`running`, `completed`, `cancelled`).
- `notes`: Optional free-text field.
- `createdBy`: Reference to the User who placed the order.

### Order & Table API Endpoints

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tables` | `admin`, `cashier` | List all 10 tables with status and active order ref |
| `GET` | `/api/tables/:id` | `admin`, `cashier` | Get single table details |
| `GET` | `/api/orders` | `admin`, `cashier` | List orders; filters: `orderType`, `status`, `table`, `date`, `search` |
| `GET` | `/api/orders/:id` | `admin`, `cashier` | Get full order with populated table and item details |
| `POST` | `/api/orders` | `admin`, `cashier` | Place a new order. Validates items against catalog; sets table to `running` for Dine-In. Returns 409 if table already has a running order. |
| `PUT` | `/api/orders/:id` | `admin`, `cashier` | Replace all items in a `running` order; recalculates subtotal server-side |
| `PATCH` | `/api/orders/:id/items` | `admin`, `cashier` | Add or update individual items in a running order |
| `PATCH` | `/api/orders/:id/status` | `admin`, `cashier` | Transition order status (`running` → `completed` or `cancelled`). Frees table automatically. |
| `DELETE`| `/api/orders/:id/items/:itemId` | `admin`, `cashier` | Remove a single item from a running order |

### Business Rules
- **Price Snapshot Immunity:** Menu catalog price changes never affect existing order records.
- **Table Concurrency Guard:** A table cannot have two simultaneous active orders (HTTP 409).
- **Atomic Table Sync:** Completing or cancelling a Dine-In order atomically sets `table.status = 'free'` and clears `currentOrder`.
- **Server-side Calculations:** All subtotals and line totals are computed on the backend; frontend values are ignored.
- **Item Availability Check:** Only `isAvailable: true` menu items can be added to new orders.

### Frontend Phase 3 UI

| Page | Route | Description |
| :--- | :--- | :--- |
| **Tables** | `/tables` | Interactive floor-plan grid of 10 tables. Free/Running status badges. KPI summary cards. Click free table → start Dine-In POS. Click running table → manage active order. |
| **POS Billing** | `/pos` | Split-screen interface. Left: menu catalog with search and category/veg filters. Right: cart with order type selector, table picker, quantity steppers, line totals (₹), notes and order actions (place/update/complete/cancel). |
| **Orders** | `/orders` | Paginated orders ledger with multi-filter search (status, type, date), running order management, and order status transitions. |

---

## 7. Phase 4: Billing, GST Calculations & Payment Management

### Bill Model (`backend/src/models/bill.model.js`)
Complete financial document with:
- `billNumber`: Unique sequential identifier (`BILL-YYYYMMDD-XXXX`) generated via atomic MongoDB counter.
- `order`: Reference to the source order (unique — prevents duplicate bills).
- Snapshots: `orderNumber`, `orderType`, `tableNumber`, `cashierName`, `items[]`.
- **Financial fields:** `subtotal`, `discountType/Value/Amount`, `taxableAmount`, `cgstRate/Amount`, `sgstRate/Amount`, `totalBeforeRoundOff`, `roundOff`, `grandTotal`.
- `payments[]`: Embedded payment entries (`paymentMode`, `amount`, `referenceNumber`).
- `totalPaid`, `balance`, `paymentStatus` (`unpaid` / `partially_paid` / `paid`), `status` (`active` / `completed` / `cancelled`).

### Counter Model (`backend/src/models/counter.model.js`)
Atomic daily counter using `findOneAndUpdate` with `$inc` — concurrency-safe, resets each day, prevents duplicate bill numbers under simultaneous requests.

### GST Calculation Logic
All calculations are computed server-side. Frontend values are never trusted:

1. `subtotal` = sum of item line totals from order snapshots
2. `discountAmount` = % of subtotal or fixed amount (validated: 0–100%, fixed ≤ subtotal)
3. `taxableAmount` = subtotal − discountAmount
4. `CGST (2.5%)` = taxableAmount × 2.5 / 100
5. `SGST (2.5%)` = taxableAmount × 2.5 / 100
6. `totalBeforeRoundOff` = taxableAmount + CGST + SGST
7. `grandTotal` = `Math.round(totalBeforeRoundOff)`, `roundOff` = grandTotal − totalBeforeRoundOff

### Bill & Payment API Endpoints

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bills` | `admin`, `cashier` | List bills; filters: `status`, `paymentStatus`, `orderType`, `date`, `search` |
| `GET` | `/api/bills/:id` | `admin`, `cashier` | Get single bill with cashier & order details |
| `GET` | `/api/bills/order/:orderId` | `admin`, `cashier` | Get the bill for a specific order |
| `POST` | `/api/bills` | `admin`, `cashier` | Generate bill from a running order. Validates order status, computes all GST server-side, prevents duplicates (HTTP 409 on duplicate). |
| `POST` | `/api/bills/:id/payments` | `admin`, `cashier` | Add a payment entry. Supports `cash`, `upi`, `card`. Validates: positive amount, no overpayment, valid mode. On full payment: marks order completed and frees table. |

### Payment Rules
- **Split payments:** Multiple entries per bill (cash + UPI + card).
- **Partial payment:** `paymentStatus = partially_paid`, order and table remain active.
- **Full payment:** `paymentStatus = paid`, order marked `completed`, table freed atomically.
- **Overpayment prevention:** `amount > balance` returns HTTP 400.
- **Concurrent safety:** Unique MongoDB index on `order` field prevents duplicate bills even under simultaneous requests.

### Frontend Phase 4 UI

| Page | Route | Description |
| :--- | :--- | :--- |
| **Billing & Payment** | `/billing` | Order selector, discount panel (none/percentage/fixed), live financial breakdown with GST preview, payment mode buttons (Cash/UPI/Card), split payment recording, real-time balance tracker, full-settlement flow. |
| **Bills History** | `/bills` | Paginated bill ledger with KPI summary cards, search, payment-status and order-type filters, receipt preview per bill. |
| **Bill Receipt** | (Modal) | Professional thermal-receipt style layout with restaurant header, item table with veg/non-veg indicators, GST breakdown, payment entries, PAID/PARTIAL stamp. Print and Download PDF via browser print dialog. |

---

## 8. Phase 5: Bill History, Advanced Search, Filters & Cancellation

### Bill History & Reporting
- Comprehensive audit ledger of all issued bills with full financial tracking.
- Columns: Bill Number, Date & Time, Order Type (`Dine-In` / `Takeaway`), Table Number, Cashier Name, Subtotal, Discount, GST (CGST 2.5% + SGST 2.5%), Grand Total, Amount Paid, Balance, Payment Status (`Paid`, `Partially Paid`, `Unpaid`), Bill Lifecycle Status (`Completed`, `Cancelled`, `Active`), and Actions.
- Real-time KPI summary counters: Total Bills, Fully Paid, Partially Paid, Unpaid, and Cancelled bills.
- Cancelled bills are visually distinct (red badge, strike-through, transparent card row).

### Advanced Search & Multi-criteria Filtering
- **Backend-Driven Querying:** Queries execute at the database level with MongoDB indexes and pagination support (`page`, `limit`, `skip`, `totalCount`, `totalPages`).
- **Bill Number & Keyword Search:** Case-insensitive search across `billNumber`, `orderNumber`, `tableNumber`, and `cashierName`.
- **Date Range Filters:** Query by `startDate` and `endDate` boundaries (inclusive).
- **Payment Mode Filter:** Filter bills containing transactions for specific payment methods (`cash`, `upi`, `card`).
- **Payment Status Filter:** Filter by settlement stage (`paid`, `partially_paid`, `unpaid`).
- **Bill Status Filter:** Filter by lifecycle state (`completed`, `cancelled`, `active`).
- **Order Type Filter:** Filter by service model (`dine-in`, `takeaway`).
- **One-click Reset:** "Clear all filters" button resets all filters and returns pagination to Page 1.

### Bill Cancellation & Financial Policy
- **Strict Role-Based Authorization:** Bill cancellation is **Admin-Only** (`PATCH /api/bills/:id/cancel`). Cashiers receive `HTTP 403 Forbidden` if attempted, and unauthenticated requests receive `HTTP 401 Unauthorized`.
- **Audit Traceability & Metadata:**
  - `cancelledBy`: User ObjectId reference to the administrator who approved cancellation.
  - `cancelledAt`: Timestamp of the cancellation event.
  - `cancellationReason`: Mandatory non-empty string explaining the reason (min 3 chars).
- **No Physical Deletion:** Cancelled documents remain permanently in MongoDB with status `cancelled` for historic audit and accounting reconciliation.
- **Financial Immutability:** All item snapshots, unit prices, line totals, and historic payment entries are strictly preserved.
- **Refund Policy Notice:** Cancellation strictly voids the tax invoice in accounting records; it **does NOT** initiate an automated payment gateway refund or cash disbursement.
- **Order & Table Lifecycle Isolation:** Cancelling a bill does not reverse or reopen completed orders or free tables, preventing race conditions and table allocation collisions on the restaurant floor.
- **Duplicate Prevention:** A bill cannot be cancelled more than once; repeat cancellation attempts are rejected with `HTTP 400 Bad Request`.

### Phase 5 API Endpoints

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bills` | `admin`, `cashier` | List bills with search (`search`), date range (`startDate`, `endDate`), `paymentStatus`, `paymentMode`, `billStatus`, and pagination (`page`, `limit`). |
| `GET` | `/api/bills/:id` | `admin`, `cashier` | Get complete bill receipt details, items, payment transactions, and cancellation metadata. |
| `PATCH`| `/api/bills/:id/cancel` | `admin` | **Admin only.** Cancel a bill with required `reason`. Records audit trail and prevents double cancellation. |

---

## 9. Phase 6: Admin Dashboard, Sales Analytics & Reports

### Executive Dashboard Features
- **Executive Admin Dashboard (`/`)**: High-level real-time operations and revenue tracking interface restricted strictly to Administrators. Cashiers access an operational portal with direct links to Tables, POS, Orders Ledger, and Billing without exposing financial data.
- **8 Live Financial KPI Metrics**:
  1. **Today's Billed Sales:** Total invoice value generated on non-cancelled bills. Includes previous-day percentage change comparisons.
  2. **Today's Amount Collected:** Actual cash, UPI, and card collections received. Includes previous-day percentage change comparisons.
  3. **Today's Outstanding Balance:** Remaining receivables across unpaid and partially paid bills.
  4. **Average Bill Value:** Server-calculated ticket size (`Billed Sales / Valid Bills`).
  5. **Today's Total Bills:** Count of valid non-cancelled invoices.
  6. **Today's Completed Bills:** Count of fully settled invoices.
  7. **Today's Cancelled Bills:** Distinct count of voided invoices.
  8. **Today's Orders:** Dine-In and Takeaway orders placed.
- **7-Day Sales & Collections Trend Chart:** Interactive responsive Recharts dual-bar visualization tracking daily billed sales against recorded collections over the last 7 calendar days.
- **Payment Channel Distribution:** Recharts doughnut breakdown displaying actual collection totals and percentages across **Cash**, **UPI**, and **Card**.
- **Today's Top-Selling Dishes:** Item-level breakdown of top culinary dishes by quantity sold, gross revenue, and FSSAI veg/non-veg indicators.

### Financial Calculation & Accounting Rules
1. **Billed Sales:** Sum of `grandTotal` of non-cancelled bills (`status !== 'cancelled'`). Includes partially paid bills because they represent invoiced sales. Excludes cancelled bills.
2. **Amount Collected:** Sum of actual transaction amounts (`payments.amount`) across valid bills. Differentiates Cash, UPI, and Card. **Never** counts an unpaid or partially paid bill's full grandTotal as collected. Excludes payments on cancelled bills. Split payments are aggregated cleanly without double-counting.
3. **Outstanding Balance:** Sum of `balance` from active and partially paid non-cancelled bills.
4. **Average Bill Value:** Computed as `totalBilledSales / validBillsCount`, handling zero bills safely.
5. **Item-Level Sales:** Aggregated strictly from immutable frozen snapshots (`items.price`, `items.lineTotal`, `items.quantity`) stored in MongoDB at billing time, never using current catalog prices.

### Timezone Precision (Asia/Kolkata — IST)
- All financial reports operate under **Indian Standard Time (`Asia/Kolkata`, UTC+05:30)**.
- Day boundaries are converted accurately:
  - Day Start: `00:00:00.000 IST` (Previous day `18:30:00.000 UTC`).
  - Day End: `23:59:59.999 IST` (Current day `18:29:59.999 UTC`).
- Records punched close to midnight are guaranteed to land on their correct Indian calendar reporting day.

### Reports Suite (`/reports`)
- **Date Presets:** One-click presets for **Today**, **Yesterday**, **Last 7 Days**, **This Month**, and custom date range pickers.
- **Four Dedicated Report Tabs:**
  - **A. Daily Sales & Taxes Report:** Summary of Billed Sales, Collected Amount, Outstanding Balance, Subtotal, Discounts, CGST (2.5%), SGST (2.5%), Total GST (5%), and settlement status breakdown.
  - **B. Payment Mode Report:** Mode-wise collection totals, transaction counts, and percentage distribution across Cash, UPI, and Card.
  - **C. Item-wise Sales Report:** Detailed menu item sales table with quantity sold, revenue, rate snapshots, search filter, and sorting by quantity or revenue.
  - **D. Printable Day-End Closing Sheet:** Formatted daily closing report with restaurant branding, tax summaries, payment channels, top-selling items, and sign-off lines. Supports instant **Print** and **Download PDF** via browser print styling.

### Phase 6 API Endpoints (Admin Only)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | `admin` | Today's KPIs, outstanding balance, and previous-day comparisons |
| `GET` | `/api/dashboard/payment-summary` | `admin` | Collection breakdown by Cash, UPI, and Card with percentages |
| `GET` | `/api/dashboard/top-items` | `admin` | Top-selling menu items by quantity and revenue |
| `GET` | `/api/dashboard/sales-trend` | `admin` | Daily billed sales and collections for the last 7 calendar days |
| `GET` | `/api/reports/daily-sales` | `admin` | Comprehensive daily sales, taxes, discounts, and balances |
| `GET` | `/api/reports/payment-summary` | `admin` | Detailed collection channels and transaction counts |
| `GET` | `/api/reports/item-sales` | `admin` | Item-level quantities, revenues, and contribution percentages |
| `GET` | `/api/reports/day-end` | `admin` | Certified printable daily closing statement for a selected date |

---

## 10. Project Architecture

```
restaurant-billing-system/
├── backend/
│   ├── src/
│   │   ├── config/             # Database, seeders & DNS
│   │   │   ├── db.js           # Mongoose MongoDB Atlas connection
│   │   │   ├── menuSeed.js     # Idempotent 24-item culinary catalog seeder
│   │   │   ├── tableSeed.js    # Idempotent 10-table seeder (T1-T10)
│   │   │   └── seed.js         # Master seeder (users, menu & tables)
│   │   ├── controllers/        # Controllers & business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── bill.controller.js      ← Phase 4
│   │   │   ├── health.controller.js
│   │   │   ├── menu.controller.js
│   │   │   ├── order.controller.js
│   │   │   └── table.controller.js
│   │   ├── middleware/         # Security & error handling
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── validate.middleware.js
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── bill.model.js           ← Phase 4
│   │   │   ├── counter.model.js        ← Phase 4
│   │   │   ├── menu.model.js
│   │   │   ├── order.model.js
│   │   │   ├── table.model.js
│   │   │   └── user.model.js
│   │   ├── routes/             # Modular Express routers
│   │   │   ├── auth.routes.js
│   │   │   ├── bill.routes.js          ← Phase 4
│   │   │   ├── health.routes.js
│   │   │   ├── menu.routes.js
│   │   │   ├── order.routes.js
│   │   │   ├── table.routes.js
│   │   │   └── index.js
│   │   ├── utils/              # Utilities
│   │   │   ├── billNumber.util.js      ← Phase 4
│   │   │   ├── orderNumber.util.js
│   │   │   └── token.util.js
│   │   ├── validators/         # express-validator schemas
│   │   │   ├── auth.validator.js
│   │   │   ├── bill.validator.js       ← Phase 4
│   │   │   ├── menu.validator.js
│   │   │   └── order.validator.js
│   │   ├── app.js              # Express app pipeline
│   │   └── server.js           # HTTP server bootstrap
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── billing/
│   │   │   │   └── BillReceiptModal.jsx   ← Phase 4
│   │   │   ├── common/         # Card, StatusBadge
│   │   │   ├── layout/         # MainLayout, Sidebar, Header
│   │   │   └── menu/           # VegIndicator, MenuItemModal, DeleteConfirmModal
│   │   ├── context/            # AuthContext provider
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx          ← Phase 6 Admin Dashboard
│   │   │   ├── ReportsPage.jsx            ← Phase 6 Reports Suite
│   │   │   ├── BillingPage.jsx            ← Phase 4
│   │   │   ├── BillsPage.jsx              ← Phase 4 & Phase 5
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── MenuPage.jsx
│   │   │   ├── OrdersPage.jsx
│   │   │   ├── POSPage.jsx
│   │   │   ├── TablesPage.jsx
│   │   │   ├── AccessDeniedPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── routes/             # AppRoutes, ProtectedRoute
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── billService.js             ← Phase 4 & Phase 5
│   │   │   ├── reportService.js           ← Phase 6
│   │   │   ├── menuService.js
│   │   │   ├── orderService.js
│   │   │   └── tableService.js
│   │   ├── utils/              # formatters.js (INR currency ₹, dates)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 11. Running the Application and Automated Tests

### 1. Start the Backend Server
```bash
cd backend
npm run dev     # Starts with Nodemon auto-reload on http://localhost:5000
```

### 2. Start the Frontend Development Server
```bash
cd frontend
npm run dev     # Starts Vite development server on http://localhost:5173
```

### 3. Run Automated Tests
```bash
cd backend
npm test                # Runs complete test suite (Phase 5 + Phase 6 + Regression: 51 tests)
npm run test:phase5     # Runs Phase 5 test suite (20 tests)
npm run test:phase6     # Runs Phase 6 test suite (22 tests)
npm run test:regression # Runs Phase 1-4 regression tests (9 tests)
```
Login as `admin` (`Admin@123`) or `cashier` (`Cashier@123`).
