import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingBag,
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
  Check,
  RotateCcw,
  Receipt,
  FileText,
} from 'lucide-react';
import { getMenuItems } from '../services/menuService';
import { getTables } from '../services/tableService';
import {
  createOrder,
  updateOrder,
  getOrderById,
  updateOrderStatus,
} from '../services/orderService';
import { formatCurrency } from '../utils/formatters';
import VegIndicator from '../components/menu/VegIndicator';

const CATEGORIES = [
  'All',
  'Starters',
  'Main Course',
  'Breads',
  'Biryani',
  'Beverages',
  'Desserts',
];

export default function POSPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active query parameters
  const preselectedTable = searchParams.get('table');
  const existingOrderId = searchParams.get('orderId');

  // Menu catalog state
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFoodType, setSelectedFoodType] = useState('All');

  // Tables state
  const [tables, setTables] = useState([]);

  // Active Order / Cart state
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderType, setOrderType] = useState('dine-in');
  const [selectedTableNumber, setSelectedTableNumber] = useState(preselectedTable || 'T1');
  const [cartItems, setCartItems] = useState([]); // [{ menuItem: { id, name, price, foodType }, quantity }]
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch available menu catalog items
  const loadMenu = async () => {
    setLoadingMenu(true);
    try {
      const response = await getMenuItems({ isAvailable: 'true' });
      setMenuItems(response.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load menu catalog');
    } finally {
      setLoadingMenu(false);
    }
  };

  // 2. Fetch tables list
  const loadTables = async () => {
    try {
      const response = await getTables();
      setTables(response.data || []);
    } catch (err) {
      console.warn('Failed to fetch tables:', err.message);
    }
  };

  // 3. Load existing order if orderId query is passed
  const loadExistingOrder = async (orderId) => {
    try {
      const response = await getOrderById(orderId);
      const order = response.data;
      setActiveOrder(order);
      setOrderType(order.orderType);
      if (order.table) {
        setSelectedTableNumber(order.table.tableNumber);
      }
      setOrderNotes(order.notes || '');

      // Transform items to cart format
      const formattedItems = order.items.map((item) => ({
        menuItem: {
          id: item.menuItem?.id || item.menuItem?._id || item.menuItem,
          name: item.itemName,
          price: item.price,
          foodType: item.foodType,
        },
        quantity: item.quantity,
      }));
      setCartItems(formattedItems);
      toast.success(`Loaded active order ${order.orderNumber}`);
    } catch (err) {
      toast.error(err.message || 'Failed to load active order');
    }
  };

  useEffect(() => {
    loadMenu();
    loadTables();
  }, []);

  useEffect(() => {
    if (existingOrderId) {
      loadExistingOrder(existingOrderId);
    } else if (preselectedTable) {
      setOrderType('dine-in');
      setSelectedTableNumber(preselectedTable);
    }
  }, [existingOrderId, preselectedTable]);

  // When selecting a table in Dine-In mode, check if that table already has an active running order!
  const handleTableChange = (tableNum) => {
    setSelectedTableNumber(tableNum);
    const tableObj = tables.find((t) => t.tableNumber === tableNum);
    if (tableObj && tableObj.status === 'running' && tableObj.currentOrder) {
      const orderId = tableObj.currentOrder.id || tableObj.currentOrder._id;
      loadExistingOrder(orderId);
    } else if (!existingOrderId) {
      // If table is free and we weren't explicitly editing another order, reset active order
      setActiveOrder(null);
    }
  };

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      const matchesFoodType =
        selectedFoodType === 'All' || item.foodType === selectedFoodType;

      return matchesSearch && matchesCategory && matchesFoodType;
    });
  }, [menuItems, searchQuery, selectedCategory, selectedFoodType]);

  // Cart operations
  const addToCart = (menuItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.menuItem.id === menuItem.id || i.menuItem._id === menuItem.id
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [...prev, { menuItem, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          const currentId = item.menuItem.id || item.menuItem._id;
          if (currentId === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeItem = (itemId) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => (item.menuItem.id || item.menuItem._id) !== itemId
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveOrder(null);
    setOrderNotes('');
    navigate('/pos', { replace: true });
  };

  // Subtotal calculation (frontend display preview; backend strictly enforces price)
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
  }, [cartItems]);

  // Submit / Save Order Handler
  const handleSaveOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Please add at least one menu item to the order');
      return;
    }

    if (orderType === 'dine-in' && !selectedTableNumber) {
      toast.error('Please select a table for Dine-In');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadItems = cartItems.map((item) => ({
        menuItem: item.menuItem.id || item.menuItem._id,
        quantity: item.quantity,
      }));

      if (activeOrder && activeOrder.status === 'running') {
        // Update existing running order
        const response = await updateOrder(activeOrder.id || activeOrder._id, {
          items: payloadItems,
          notes: orderNotes,
        });
        toast.success(`Order ${response.data.orderNumber} updated successfully!`);
        setActiveOrder(response.data);
      } else {
        // Create new order
        const payload = {
          orderType,
          table: orderType === 'dine-in' ? selectedTableNumber : null,
          items: payloadItems,
          notes: orderNotes,
        };

        const response = await createOrder(payload);
        toast.success(`Order ${response.data.orderNumber} placed successfully!`);
        setActiveOrder(response.data);
      }

      loadTables();
    } catch (err) {
      toast.error(err.message || 'Failed to save order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change Status (Complete / Cancel)
  const handleStatusChange = async (newStatus) => {
    if (!activeOrder) return;
    const orderId = activeOrder.id || activeOrder._id;

    setIsSubmitting(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(
        `Order ${activeOrder.orderNumber} marked as ${newStatus.toUpperCase()}`
      );
      loadTables();
      clearCart();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/tables')}
            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
            title="Return to Table Floor Plan"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <span>Point of Sale Billing</span>
              {activeOrder && (
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                  Active: {activeOrder.orderNumber}
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-500">
              Live order creation, table management, and instant bill calculations.
            </p>
          </div>
        </div>

        {activeOrder && (
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Order</span>
          </button>
        )}
      </div>

      {/* POS Two-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Menu Items Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Food Type Filter Bar */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-3 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
                />
              </div>

              {/* Food Type Select */}
              <select
                value={selectedFoodType}
                onChange={(e) => setSelectedFoodType(e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 shrink-0"
              >
                <option value="All">All Food</option>
                <option value="veg">Veg</option>
                <option value="non-veg">Non-Veg</option>
              </select>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          {loadingMenu ? (
            <div className="bg-white rounded-xl border border-neutral-200/90 p-12 text-center shadow-xs">
              <Loader2 className="h-7 w-7 text-neutral-700 animate-spin mx-auto mb-2" />
              <p className="text-xs text-neutral-500">Loading catalog items...</p>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200/90 p-10 text-center shadow-xs space-y-2">
              <Utensils className="h-6 w-6 text-neutral-400 mx-auto" />
              <p className="text-xs font-medium text-neutral-700">No items match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id || item._id}
                  className="bg-white rounded-xl border border-neutral-200/90 p-3.5 shadow-xs hover:border-neutral-300 transition flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <VegIndicator foodType={item.foodType} size="sm" />
                        <h4 className="text-xs font-semibold text-neutral-900 leading-tight">
                          {item.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-neutral-400 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                    <span className="text-xs font-bold text-neutral-900">
                      {formatCurrency(item.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-[11px] font-medium transition shadow-2xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Order / Cart Details (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4 sticky top-20">
          {/* Order Configuration Bar */}
          <div className="space-y-3 pb-3 border-b border-neutral-100">
            {/* Dine-In vs Takeaway Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-neutral-100/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOrderType('dine-in')}
                className={`py-1.5 rounded-lg transition ${
                  orderType === 'dine-in'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Dine-In
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`py-1.5 rounded-lg transition ${
                  orderType === 'takeaway'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Takeaway
              </button>
            </div>

            {/* Table Selection Dropdown (Only for Dine-In) */}
            {orderType === 'dine-in' && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <label className="font-medium text-neutral-700">Seated Table:</label>
                <select
                  value={selectedTableNumber}
                  onChange={(e) => handleTableChange(e.target.value)}
                  disabled={Boolean(activeOrder)}
                  className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {tables.map((t) => (
                    <option key={t.tableNumber} value={t.tableNumber}>
                      {t.tableNumber} ({t.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 space-y-2">
                <ShoppingBag className="h-8 w-8 mx-auto stroke-1" />
                <p className="text-xs">No items added to current order</p>
                <p className="text-[11px] text-neutral-400">
                  Select culinary dishes from the left to populate the bill
                </p>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemId = item.menuItem.id || item.menuItem._id;
                const lineTotal = item.menuItem.price * item.quantity;

                return (
                  <div
                    key={itemId}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <VegIndicator foodType={item.menuItem.foodType} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">
                          {item.menuItem.name}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {formatCurrency(item.menuItem.price)} each
                        </p>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-white border border-neutral-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(itemId, -1)}
                        className="p-1 rounded text-neutral-600 hover:bg-neutral-100"
                        title="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-neutral-900 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(itemId, 1)}
                        className="p-1 rounded text-neutral-600 hover:bg-neutral-100"
                        title="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="w-16 text-right font-bold text-neutral-900 text-xs">
                      {formatCurrency(lineTotal)}
                    </div>

                    {/* Delete Item Button */}
                    <button
                      type="button"
                      onClick={() => removeItem(itemId)}
                      className="p-1 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded transition"
                      title="Remove Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Order Notes Field */}
          <div>
            <textarea
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Special instructions or notes (e.g. less spicy)..."
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
            />
          </div>

          {/* Subtotal Summary Card */}
          <div className="p-3.5 rounded-xl bg-neutral-900 text-white space-y-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Items Total ({cartItems.length} items):</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-sm font-bold">
              <span>Subtotal:</span>
              <span className="text-base text-emerald-400">
                {formatCurrency(cartSubtotal)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>
                {activeOrder ? 'Update Running Order' : 'Place & Save Order'}
              </span>
            </button>

            {/* If order is currently running, offer Bill & Settle and Cancel quick actions */}
            {activeOrder && activeOrder.status === 'running' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate(`/billing?orderId=${activeOrder.id || activeOrder._id}`)}
                  disabled={isSubmitting}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Bill & Settle</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isSubmitting}
                  className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Cancel Order</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
