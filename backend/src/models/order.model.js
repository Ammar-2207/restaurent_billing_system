const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
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
      required: [true, 'Price snapshot is required'],
      min: [0, 'Price must be non-negative'],
    },
    foodType: {
      type: String,
      enum: ['veg', 'non-veg'],
      required: [true, 'Food type snapshot is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    lineTotal: {
      type: Number,
      required: [true, 'Line total is required'],
      min: [0, 'Line total must be non-negative'],
    },
  },
  {
    _id: true, // Keep subdocument _id for individual item operations
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: {
        values: ['dine-in', 'takeaway'],
        message: '{VALUE} is not a valid order type. Allowed: dine-in, takeaway',
      },
      required: [true, 'Order type is required'],
      index: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'An order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal must be non-negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['running', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid order status. Allowed: running, completed, cancelled',
      },
      default: 'running',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for searching, table queries, and date ranges
orderSchema.index({ table: 1, status: 1 });
orderSchema.index({ status: 1, orderType: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
