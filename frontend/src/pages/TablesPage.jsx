import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutGrid,
  RefreshCw,
  CheckCircle,
  Clock,
  ArrowRight,
  Receipt,
  UtensilsCrossed,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getTables } from '../services/tableService';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function TablesPage() {
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState({ total: 10, free: 10, running: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTableFloor = async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTables();
      setTables(response.data || []);
      if (response.stats) {
        setStats(response.stats);
      }
      if (showToast) {
        toast.success('Table status updated successfully');
      }
    } catch (err) {
      const message = err.message || 'Failed to fetch table floor plan';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableFloor(false);
  }, []);

  // Handle clicking on a table card
  const handleTableAction = (table) => {
    if (table.status === 'running' && table.currentOrder) {
      const orderId = table.currentOrder.id || table.currentOrder._id;
      navigate(`/pos?orderId=${orderId}`);
    } else {
      navigate(`/pos?table=${table.tableNumber}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <span>Dine-In Floor Plan</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              10 Tables Seeded
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time visual monitoring of restaurant tables, occupancy, and active dining orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTableFloor(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 text-xs font-medium text-neutral-700 transition shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Floor'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tables */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Total Dining Capacity</span>
            <LayoutGrid className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.total}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Permanent dining stations (T1 - T10)
          </div>
        </div>

        {/* Free Tables */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Available (Free)</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.free}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Ready to seat incoming guests
          </div>
        </div>

        {/* Running Tables */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Occupied (Running)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {stats.running}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Active orders currently in service
          </div>
        </div>
      </div>

      {/* Main Tables Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-neutral-200/90 p-16 text-center shadow-xs">
          <Loader2 className="h-8 w-8 text-neutral-700 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-neutral-500">
            Fetching table occupancy status...
          </p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-600 shadow-xs space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto" />
          <h4 className="font-semibold text-sm">Failed to Load Floor Plan</h4>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchTableFloor(false)}
            className="mt-3 px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const isRunning = table.status === 'running';
            const currentOrder = table.currentOrder;

            return (
              <div
                key={table.id || table._id}
                className={`relative rounded-2xl border p-5 transition-all flex flex-col justify-between shadow-xs ${
                  isRunning
                    ? 'bg-amber-50/20 border-amber-300/80 hover:border-amber-400 hover:shadow-sm'
                    : 'bg-white border-neutral-200/90 hover:border-neutral-300 hover:shadow-xs'
                }`}
              >
                {/* Table Header: Number & Status Badge */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm tracking-tight ${
                          isRunning
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {table.tableNumber}
                      </div>
                      <span className="text-xs font-semibold text-neutral-900">
                        Table {table.tableNumber}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                        isRunning
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isRunning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span>{table.status}</span>
                    </span>
                  </div>

                  {/* Active Order Details (if running) */}
                  {isRunning && currentOrder ? (
                    <div className="space-y-2 py-2 px-3 rounded-xl bg-white/90 border border-amber-200/70 text-xs">
                      <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                        <span>Order No:</span>
                        <span className="font-mono font-semibold text-neutral-800">
                          {currentOrder.orderNumber}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                        <span>Items Count:</span>
                        <span className="font-semibold text-neutral-800">
                          {currentOrder.items?.length || 0} items
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 font-medium">
                        <span className="text-neutral-600 text-[11px]">Running Bill:</span>
                        <span className="font-bold text-neutral-900 text-xs">
                          {formatCurrency(currentOrder.subtotal)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-[11px] text-neutral-400">
                        Table is vacant & ready for new guests
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => handleTableAction(table)}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition shadow-2xs ${
                      isRunning
                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
                        : 'bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Manage Order</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Start Dine-In</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
