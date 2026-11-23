import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Utensils,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleMenuAvailability,
  deleteMenuItem,
} from '../services/menuService';
import { formatCurrency } from '../utils/formatters';
import VegIndicator from '../components/menu/VegIndicator';
import MenuItemModal from '../components/menu/MenuItemModal';
import DeleteConfirmModal from '../components/menu/DeleteConfirmModal';
import Card from '../components/common/Card';

const CATEGORIES = [
  'All',
  'Starters',
  'Main Course',
  'Breads',
  'Biryani',
  'Beverages',
  'Desserts',
];

export default function MenuPage() {
  const { user, isAdmin } = useAuth();

  // Catalog items and stats
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    unavailable: 0,
    veg: 0,
    nonVeg: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and search state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFoodType, setSelectedFoodType] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [sortBy, setSortBy] = useState('category');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch items from backend API
  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search,
        category: selectedCategory,
        foodType: selectedFoodType,
        isAvailable: isAdmin ? selectedAvailability : undefined,
        sort: sortBy,
      };

      const response = await getMenuItems(params);
      setItems(response.data || []);
      if (response.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      const message = err.message || 'Failed to load menu items';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMenu();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedFoodType, selectedAvailability, sortBy]);

  // Handle Create or Update
  const handleSaveItem = async (formData) => {
    if (editingItem) {
      const res = await updateMenuItem(editingItem.id, formData);
      toast.success(res.message || 'Menu item updated successfully');
    } else {
      const res = await createMenuItem(formData);
      toast.success(res.message || 'Menu item created successfully');
    }
    fetchMenu();
  };

  // Handle Quick Availability Toggle
  const handleToggleAvailability = async (item) => {
    if (!isAdmin) return;
    const newStatus = !item.isAvailable;
    try {
      await toggleMenuAvailability(item.id, newStatus);
      toast.success(
        `"${item.name}" marked as ${newStatus ? 'Available' : 'Unavailable'}`
      );
      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newStatus } : i))
      );
      setStats((prev) => ({
        ...prev,
        available: newStatus ? prev.available + 1 : prev.available - 1,
        unavailable: newStatus ? prev.unavailable - 1 : prev.unavailable + 1,
      }));
    } catch (err) {
      toast.error(err.message || 'Failed to update availability status');
      fetchMenu();
    }
  };

  // Handle Delete Confirmation
  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteMenuItem(deletingItem.id);
      toast.success(`"${deletingItem.name}" deleted from catalog`);
      setDeletingItem(null);
      fetchMenu();
    } catch (err) {
      toast.error(err.message || 'Failed to delete menu item');
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedFoodType('All');
    setSelectedAvailability('All');
    setSortBy('category');
  };

  const hasActiveFilters =
    search ||
    selectedCategory !== 'All' ||
    selectedFoodType !== 'All' ||
    selectedAvailability !== 'All';

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <span>Menu Catalog</span>
            {!isAdmin && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                Cashier View (Read-Only)
              </span>
            )}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {isAdmin
              ? 'Manage restaurant menu items, pricing, culinary categories, and instant availability.'
              : 'Browse and search available culinary items for live billing and order processing.'}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-xs font-semibold transition shadow-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Menu Item</span>
          </button>
        )}
      </div>

      {/* Summary KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Total Menu Items</span>
            <Utensils className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.total}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Across 6 culinary categories
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Available for Order</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {stats.available}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Active in Point of Sale
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Currently Unavailable</span>
            <XCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {stats.unavailable}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Hidden from Cashier views
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Dietary Breakdown</span>
            <Sparkles className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5">
              <VegIndicator foodType="veg" size="sm" />
              <span className="text-sm font-bold text-neutral-800">
                {stats.veg}
              </span>
            </div>
            <span className="text-neutral-300">|</span>
            <div className="flex items-center gap-1.5">
              <VegIndicator foodType="non-veg" size="sm" />
              <span className="text-sm font-bold text-neutral-800">
                {stats.nonVeg}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Veg / Non-Veg split</div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name or description..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Select Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Food Type */}
            <select
              value={selectedFoodType}
              onChange={(e) => setSelectedFoodType(e.target.value)}
              className="px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="All">All Food Types</option>
              <option value="veg">Veg Only</option>
              <option value="non-veg">Non-Veg Only</option>
            </select>

            {/* Availability (Admin Only) */}
            {isAdmin && (
              <select
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                className="px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="All">All Statuses</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            )}

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="category">Sort: Category</option>
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition"
                title="Reset filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-neutral-100 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-neutral-100/70 text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Catalog View */}
      {loading ? (
        <div className="bg-white rounded-xl border border-neutral-200/90 p-12 text-center shadow-xs">
          <Loader2 className="h-8 w-8 text-neutral-700 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-neutral-500">
            Loading menu catalog...
          </p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-600 shadow-xs space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto" />
          <h4 className="font-semibold text-sm">Failed to Load Menu Catalog</h4>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={fetchMenu}
            className="mt-3 px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200/90 p-12 text-center shadow-xs space-y-3">
          <div className="h-12 w-12 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Utensils className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-sm text-neutral-800">
            No Menu Items Found
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No items matched your current filter or search criteria. Try clearing some filters.'
              : 'There are currently no items in the menu catalog.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/90 text-neutral-500 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="py-3 px-4 w-10">Type</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-neutral-50/60 transition ${
                      !item.isAvailable ? 'bg-neutral-50/30 opacity-75' : ''
                    }`}
                  >
                    {/* Food Type Indicator */}
                    <td className="py-3 px-4 align-middle">
                      <VegIndicator foodType={item.foodType} size="md" />
                    </td>

                    {/* Name & Description */}
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium text-neutral-900 text-xs">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1 max-w-md">
                          {item.description}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 align-middle">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium text-[11px]">
                        {item.category}
                      </span>
                    </td>

                    {/* Price in INR */}
                    <td className="py-3 px-4 align-middle font-semibold text-neutral-900 text-xs">
                      {formatCurrency(item.price)}
                    </td>

                    {/* Availability Status Badge */}
                    <td className="py-3 px-4 align-middle">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
                          }`}
                          title="Click to toggle availability"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.isAvailable ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}
                          />
                          <span>{item.isAvailable ? 'Available' : 'Unavailable'}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Available</span>
                        </span>
                      )}
                    </td>

                    {/* Actions (Admin Only) */}
                    {isAdmin && (
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                            title="Edit Item"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete Item"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between text-[11px] text-neutral-500">
            <span>
              Showing {items.length} of {stats.total} menu items
            </span>
            <span>All prices listed in Indian Rupees (₹)</span>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isAdmin && (
        <MenuItemModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          initialData={editingItem}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isAdmin && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingItem)}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteItem}
          itemName={deletingItem?.name}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
