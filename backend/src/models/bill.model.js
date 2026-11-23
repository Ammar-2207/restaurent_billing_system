const mongoose = require('mongoose');

/**
 * Embedded bill item snapshot — captures price at billing time.
 * Immune to future catalog price changes.
 */
const billItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: [true, 'Menu item reference is required'],
    },
    itemName: {
      type: String,
      required: [true, 'Item name snapshot is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Item price snapshot is required'],
      min: [0, 'Price must be non-negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    foodType: {
      type: String,
      enum: ['veg', 'non-veg'],
      required: [true, 'Food type snapshot is required'],
    },
    lineTotal: {
      type: Number,
      required: [true, 'Line total is required'],
      min: [0, 'Line total must be non-negative'],
    },
  },
  { _id: true }
);

/**
 * Embedded payment entry — supports split payments across modes.
 */
const paymentEntrySchema = new mongoose.Schema(
  {
    paymentMode: {
      type: String,
      enum: {
        values: ['cash', 'upi', 'card'],
        message: '{VALUE} is not a valid payment mode. Allowed: cash, upi, card',
      },
      required: [true, 'Payment mode is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

/**
 * Bill Schema — full financial document for an order
 */
const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: [true, 'Bill number is required'],
      unique: true,
      trim: true,
      index: true,
    },

    // Order linkage
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      unique: true, // One bill per order — prevent duplicates
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number snapshot is required'],
      trim: true,
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway'],
      required: [true, 'Order type snapshot is required'],
    },
    tableNumber: {
      type: String,
      default: null,
      trim: true,
    },

    // Cashier who generated the bill
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cashier reference is required'],
    },
    cashierName: {
      type: String,
      required: [true, 'Cashier name snapshot is required'],
      trim: true,
    },

    // Frozen item snapshots from the order
    items: {
      type: [billItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Bill must contain at least one item',
      },
    },

    // Financial calculations — all computed server-side
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal must be non-negative'],
      get: (v) => Math.round(v * 100) / 100,
    },

    // Discount
    discountType: {
      type: String,
      enum: ['none', 'percentage', 'fixed'],
      default: 'none',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: [0, 'Discount value must be non-negative'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount must be non-negative'],
    },

    // GST
    taxableAmount: {
      type: Number,
      required: true,
      min: [0, 'Taxable amount must be non-negative'],
    },
    gstRate: { type: Number, default: 5 },
    cgstRate: { type: Number, default: 2.5 },
    sgstRate: { type: Number, default: 2.5 },
    cgstAmount: { type: Number, required: true, min: 0 },
    sgstAmount: { type: Number, required: true, min: 0 },

    // Totals
    totalBeforeRoundOff: { type: Number, required: true, min: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    // Payments
    payments: {
      type: [paymentEntrySchema],
      default: [],
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: [0, 'Total paid cannot be negative'],
    },
    balance: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
      index: true,
    },

    // Bill lifecycle
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },

    // Cancellation metadata
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for reporting and search
billSchema.index({ createdAt: -1 });
billSchema.index({ paymentStatus: 1, status: 1 });
billSchema.index({ orderType: 1, createdAt: -1 });

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
