const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      default: 'RestoBill Restaurant & Cafe',
    },
    tagline: {
      type: String,
      trim: true,
      default: 'Modern Multi-Cuisine Dining & POS',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '+91 98765 43210',
    },
    contactEmail: {
      type: String,
      trim: true,
      default: 'billing@restobill.com',
    },
    address: {
      type: String,
      trim: true,
      default: 'Plot 42, Bandra West, Mumbai, Maharashtra 400050',
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '27AABCU9603R1ZM',
    },
    currencySymbol: {
      type: String,
      trim: true,
      default: '₹',
    },
    defaultGstRate: {
      type: Number,
      default: 5,
      min: [0, 'GST rate cannot be negative'],
    },
    cgstRate: {
      type: Number,
      default: 2.5,
      min: [0, 'CGST rate cannot be negative'],
    },
    sgstRate: {
      type: Number,
      default: 2.5,
      min: [0, 'SGST rate cannot be negative'],
    },
    billPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'BILL-',
    },
    timezone: {
      type: String,
      trim: true,
      default: 'Asia/Kolkata',
    },
    enableRoundOff: {
      type: Boolean,
      default: true,
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

// Singleton helper: Always return the one settings document
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
