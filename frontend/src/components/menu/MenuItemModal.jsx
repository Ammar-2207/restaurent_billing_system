import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import VegIndicator from './VegIndicator';

const CATEGORIES = [
  'Starters',
  'Main Course',
  'Breads',
  'Biryani',
  'Beverages',
  'Desserts',
];

export default function MenuItemModal({ isOpen, onClose, onSave, initialData }) {
  const isEditing = Boolean(initialData);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Starters',
    price: '',
    foodType: 'veg',
    description: '',
    isAvailable: true,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || 'Starters',
        price: initialData.price !== undefined ? String(initialData.price) : '',
        foodType: initialData.foodType || 'veg',
        description: initialData.description || '',
        isAvailable: initialData.isAvailable !== undefined ? initialData.isAvailable : true,
      });
    } else {
      setFormData({
        name: '',
        category: 'Starters',
        price: '',
        foodType: 'veg',
        description: '',
        isAvailable: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
      newErrors.price = 'Please enter a valid non-negative price';
    }

    if (!['veg', 'non-veg'].includes(formData.foodType)) {
      newErrors.foodType = 'Food type must be Veg or Non-Veg';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        price: Number(formData.price),
      });
      onClose();
    } catch (err) {
      setErrors({
        submit: err.message || 'Failed to save menu item',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-neutral-900">
              {isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isEditing
                ? 'Update item details, pricing, and catalog classification.'
                : 'Add a new culinary item to your restaurant catalog.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {errors.submit}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Paneer Butter Masala"
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Category & Price Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-600 mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 font-semibold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="280"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
                />
              </div>
              {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
            </div>
          </div>

          {/* Food Type (Veg / Non-Veg) */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Food Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  formData.foodType === 'veg'
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-medium'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="foodType"
                  value="veg"
                  checked={formData.foodType === 'veg'}
                  onChange={() => setFormData({ ...formData, foodType: 'veg' })}
                  className="sr-only"
                />
                <VegIndicator foodType="veg" size="sm" />
                <span className="text-xs">Vegetarian</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  formData.foodType === 'non-veg'
                    ? 'border-red-500 bg-red-50/40 text-red-950 font-medium'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="foodType"
                  value="non-veg"
                  checked={formData.foodType === 'non-veg'}
                  onChange={() => setFormData({ ...formData, foodType: 'non-veg' })}
                  className="sr-only"
                />
                <VegIndicator foodType="non-veg" size="sm" />
                <span className="text-xs">Non-Vegetarian</span>
              </label>
            </div>
            {errors.foodType && (
              <p className="text-xs text-red-600 mt-1">{errors.foodType}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Short description of ingredients or preparation..."
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
            />
          </div>

          {/* Availability Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-xs font-medium text-neutral-800">
                Item is available for ordering
              </span>
            </label>
            <p className="text-[11px] text-neutral-400 pl-6.5 mt-0.5">
              Unavailable items are automatically hidden from Cashier point-of-sale views.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition shadow-2xs disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Menu Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
