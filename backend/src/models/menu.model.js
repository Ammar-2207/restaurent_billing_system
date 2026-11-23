const mongoose = require('mongoose');

const allowedCategories = [
  'Starters',
  'Main Course',
  'Breads',
  'Biryani',
  'Beverages',
  'Desserts',
];

const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [2, 'Item name must be at least 2 characters long'],
      maxlength: [100, 'Item name cannot exceed 100 characters'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: allowedCategories,
        message: '{VALUE} is not a valid category. Allowed: ' + allowedCategories.join(', '),
      },
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a non-negative number'],
    },
    foodType: {
      type: String,
      required: [true, 'Food type is required (veg or non-veg)'],
      enum: {
        values: ['veg', 'non-veg'],
        message: '{VALUE} is not a valid food type. Allowed: veg, non-veg',
      },
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
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

// Compound indexes for high-speed multi-criteria filtering
menuSchema.index({ category: 1, foodType: 1, isAvailable: 1 });
menuSchema.index({ name: 'text', description: 'text' });

const Menu = mongoose.model('Menu', menuSchema);

module.exports = {
  Menu,
  allowedCategories,
};
