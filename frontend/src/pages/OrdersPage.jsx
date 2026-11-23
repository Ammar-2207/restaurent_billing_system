import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShoppingBag,
  UtensilsCrossed,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getOrders, updateOrderStatus } from '../services/orderService';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import VegIndicator from '../components/menu/VegIndicator';

const STATUS_TABS = ['All', 'running', 'completed', 'cancelled'];

export default function OrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    completed: 0,
    cancelled: 0,
    dineIn: 0,
    takeaway: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');

  const fetchOrdersList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOrders({
        status: statusFilter,
        orderType: typeFilter,
        search,
      });
      setOrders(response.data || []);
      if (response.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      const message = err.message || 'Failed to fetch orders ledger';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrdersList();
    }, 250);
    return () => clearTimeout(timer);
  }, [statusFilter, typeFilter, search]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${newStatus.toUpperCase()}`);
      fetchOrdersList();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <span>Orders Ledger</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              Real-time Billing
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Complete history, status tracking, and fulfillment ledger for all Dine-In and Takeaway orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/pos')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-xs font-semibold transition shadow-xs"
        >
          <Receipt className="h-4 w-4" />
          <span>New POS Order</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Total Orders</span>
            <Receipt className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.total}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {stats.dineIn} Dine-In / {stats.takeaway} Takeaway
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Running Orders</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.running}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Active in kitchen & floor</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Completed Bills</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {stats.completed}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Settled & cleared</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Cancelled</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-400">
            {stats.cancelled}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Voided tickets</div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number (e.g. ORD-...)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition"
            />
          </div>

          {/* Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="All">All Types</option>
              <option value="dine-in">Dine-In Only</option>
              <option value="takeaway">Takeaway Only</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-100">
          {STATUS_TABS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                statusFilter === status
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100/70 text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Orders Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-neutral-200/90 p-16 text-center shadow-xs">
          <Loader2 className="h-8 w-8 text-neutral-700 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-neutral-500">
            Loading orders ledger...
          </p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-600 shadow-xs space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto" />
          <h4 className="font-semibold text-sm">Failed to Load Orders</h4>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={fetchOrdersList}
            className="mt-3 px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200/90 p-12 text-center shadow-xs space-y-2">
          <Receipt className="h-8 w-8 text-neutral-400 mx-auto" />
          <h4 className="font-semibold text-sm text-neutral-800">
            No Orders Found
          </h4>
          <p className="text-xs text-neutral-500">
            No orders match the current status or search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/90 text-neutral-500 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Type / Location</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => {
                  const isRunning = order.status === 'running';
                  const isDineIn = order.orderType === 'dine-in';

                  return (
                    <tr
                      key={order.id || order._id}
                      className="hover:bg-neutral-50/60 transition"
                    >
                      {/* Order Number & Timestamp */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-mono font-bold text-neutral-900 block">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">
                          {formatDateTime(order.createdAt)}
                        </span>
                      </td>

                      {/* Type & Table */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          {isDineIn ? (
                            <UtensilsCrossed className="h-3.5 w-3.5 text-neutral-500" />
                          ) : (
                            <ShoppingBag className="h-3.5 w-3.5 text-neutral-500" />
                          )}
                          <span className="font-semibold text-neutral-800 capitalize">
                            {order.orderType}
                          </span>
                        </div>
                        {isDineIn && order.table && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold border border-neutral-200">
                            Table {order.table.tableNumber}
                          </span>
                        )}
                      </td>

                      {/* Items Snapshot Summary */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="space-y-1">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-neutral-600 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <VegIndicator foodType={item.foodType} size="sm" />
                                <span className="truncate">{item.itemName}</span>
                              </div>
                              <span className="text-neutral-400 font-mono shrink-0">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-[10px] text-neutral-400 font-medium">
                              +{order.items.length - 3} more items...
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3.5 px-4 align-top font-bold text-neutral-900 text-sm">
                        {formatCurrency(order.subtotal)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                            order.status === 'running'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : order.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              order.status === 'running'
                                ? 'bg-amber-500'
                                : order.status === 'completed'
                                ? 'bg-emerald-500'
                                : 'bg-neutral-400'
                            }`}
                          />
                          <span>{order.status}</span>
                        </span>
                      </td>

                      {/* Created By Staff */}
                      <td className="py-3.5 px-4 align-top text-neutral-500 text-[11px]">
                        <span className="font-medium text-neutral-800 block">
                          {order.createdBy?.name || 'Staff'}
                        </span>
                        <span className="text-[10px] text-neutral-400 capitalize block">
                          Role: {order.createdBy?.role || 'user'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isRunning ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/pos?orderId=${order.id || order._id}`)
                                }
                                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-medium transition shadow-2xs"
                              >
                                Manage
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/billing?orderId=${order.id || order._id}`)
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition shadow-2xs"
                                title="Generate Bill & Collect Payment"
                              >
                                Settle
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-mono">
                              Settled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Showing {orders.length} orders in ledger</span>
            <span>All values in Indian Rupees (₹)</span>
          </div>
        </div>
      )}
    </div>
  );
}
