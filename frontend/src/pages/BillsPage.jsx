import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText,
  Search,
  RefreshCw,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Ban,
  RotateCcw,
  Calendar,
  CreditCard,
  Eye,
  Filter,
} from 'lucide-react';
import { getBills, cancelBill } from '../services/billService';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import BillReceiptModal from '../components/billing/BillReceiptModal';

const fmt = (n) => formatCurrency(n ?? 0);

const PAYMENT_STATUS_COLORS = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  unpaid: 'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_STATUS_LABELS = {
  paid: 'Paid',
  partially_paid: 'Partial',
  unpaid: 'Unpaid',
};

const BILL_STATUS_COLORS = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200 line-through decoration-red-400',
  active: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function BillsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Data & loading
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [paymentMode, setPaymentMode] = useState('All');
  const [billStatus, setBillStatus] = useState('All');
  const [orderType, setOrderType] = useState('All');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedBill, setSelectedBill] = useState(null);
  const [billToCancel, setBillToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // ── Load bills from backend ──────────────────────────────────────────────
  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (paymentStatus !== 'All') params.paymentStatus = paymentStatus;
      if (paymentMode !== 'All') params.paymentMode = paymentMode;
      if (billStatus !== 'All') params.billStatus = billStatus;
      if (orderType !== 'All') params.orderType = orderType;

      const res = await getBills(params);
      const data = res.data;
      setBills(data.data || []);
      setStats(data.stats || {});
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch {
      toast.error('Failed to load bills history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, startDate, endDate, paymentStatus, paymentMode, billStatus, orderType]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // ── Reset page to 1 when filters change ───────────────────────────────────
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPaymentStatus('All');
    setPaymentMode('All');
    setBillStatus('All');
    setOrderType('All');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    paymentStatus !== 'All' ||
    paymentMode !== 'All' ||
    billStatus !== 'All' ||
    orderType !== 'All';

  // ── Handle Admin Bill Cancellation ───────────────────────────────────────
  const handleConfirmCancel = async () => {
    if (!billToCancel) return;
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }

    setCancelling(true);
    try {
      const res = await cancelBill(billToCancel.id || billToCancel._id, cancelReason.trim());
      toast.success(res.data.message || `Bill ${billToCancel.billNumber} cancelled`);
      setBillToCancel(null);
      setCancelReason('');
      await loadBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel bill');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <span>Bills History & Ledger</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                Phase 5 Active
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              Audit trail, search, filters, receipt generation, and admin cancellation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBills}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium border border-neutral-200 px-3 py-2 rounded-lg hover:bg-neutral-50 transition"
            title="Reload bill history"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/billing')}
            className="flex items-center gap-1.5 text-xs font-medium bg-neutral-900 text-white px-3 py-2 rounded-lg hover:bg-neutral-800 transition shadow-2xs"
          >
            <Receipt className="h-3.5 w-3.5" />
            Generate New Bill
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total Bills" value={stats.total ?? 0} icon={FileText} />
        <KpiCard label="Fully Paid" value={stats.paid ?? 0} icon={CheckCircle2} color="emerald" />
        <KpiCard label="Partially Paid" value={stats.partiallyPaid ?? 0} icon={Clock} color="amber" />
        <KpiCard label="Unpaid" value={stats.unpaid ?? 0} icon={AlertCircle} color="red" />
        <KpiCard label="Cancelled" value={stats.cancelled ?? 0} icon={Ban} color="rose" />
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────── */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
            <Filter className="h-3.5 w-3.5 text-neutral-500" />
            <span>Search & Ledger Filters</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-medium transition"
            >
              <RotateCcw className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search bar */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search bill#, order#, table, cashier…"
              value={search}
              onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleFilterChange(setSearch)('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Payment Status filter */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => handleFilterChange(setPaymentStatus)(e.target.value)}
              className="w-full text-xs border border-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 bg-white text-neutral-700"
            >
              <option value="All">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* Payment Mode filter */}
          <div>
            <select
              value={paymentMode}
              onChange={(e) => handleFilterChange(setPaymentMode)(e.target.value)}
              className="w-full text-xs border border-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 bg-white text-neutral-700"
            >
              <option value="All">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div>

          {/* Bill Lifecycle Status filter */}
          <div>
            <select
              value={billStatus}
              onChange={(e) => handleFilterChange(setBillStatus)(e.target.value)}
              className="w-full text-xs border border-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 bg-white text-neutral-700"
            >
              <option value="All">All Bill Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="active">Active</option>
            </select>
          </div>

          {/* Order Type filter */}
          <div>
            <select
              value={orderType}
              onChange={(e) => handleFilterChange(setOrderType)(e.target.value)}
              className="w-full text-xs border border-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 bg-white text-neutral-700"
            >
              <option value="All">All Types</option>
              <option value="dine-in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-neutral-100 text-xs text-neutral-500">
          <div className="flex items-center gap-1.5 font-medium text-neutral-700">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span>Date Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleFilterChange(setStartDate)(e.target.value)}
              className="text-xs border border-neutral-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              title="Start Date"
            />
            <span className="text-neutral-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleFilterChange(setEndDate)(e.target.value)}
              className="text-xs border border-neutral-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              title="End Date"
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="text-[11px] text-neutral-400 hover:text-neutral-700 underline"
            >
              Reset dates
            </button>
          )}

          <div className="ml-auto text-xs text-neutral-400">
            Showing <span className="font-semibold text-neutral-700">{bills.length}</span> of{' '}
            <span className="font-semibold text-neutral-700">{totalCount}</span> bills
          </div>
        </div>
      </div>

      {/* ── Bills Table ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="text-xs">Loading bills history…</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-3">
            <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <FileText className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-700">No bills found</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {hasActiveFilters
                  ? 'No records match your selected search and filter criteria.'
                  : 'No bills have been generated in the system yet.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-medium">
                  <th className="text-left px-4 py-3">Bill Number</th>
                  <th className="text-left px-3 py-3">Date & Time</th>
                  <th className="text-left px-3 py-3">Type</th>
                  <th className="text-left px-3 py-3">Table</th>
                  <th className="text-left px-3 py-3">Cashier</th>
                  <th className="text-right px-3 py-3">Subtotal</th>
                  <th className="text-right px-3 py-3">Discount</th>
                  <th className="text-right px-3 py-3">GST (5%)</th>
                  <th className="text-right px-3 py-3">Grand Total</th>
                  <th className="text-right px-3 py-3">Paid</th>
                  <th className="text-right px-3 py-3">Balance</th>
                  <th className="text-center px-3 py-3">Payment</th>
                  <th className="text-center px-3 py-3">Bill Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bills.map((bill) => {
                  const isCancelled = bill.status === 'cancelled';
                  const totalGst = Number(((bill.cgstAmount || 0) + (bill.sgstAmount || 0)).toFixed(2));

                  return (
                    <tr
                      key={bill.id || bill._id}
                      className={`hover:bg-neutral-50/60 transition ${
                        isCancelled ? 'bg-red-50/20 opacity-75' : ''
                      }`}
                    >
                      {/* Bill Number */}
                      <td className="px-4 py-3.5 font-mono font-bold text-neutral-900">
                        <div className="flex items-center gap-1.5">
                          {isCancelled && <Ban className="h-3 w-3 text-red-500 shrink-0" />}
                          <span className={isCancelled ? 'text-red-700 line-through' : ''}>
                            {bill.billNumber}
                          </span>
                        </div>
                      </td>

                      {/* Date and Time */}
                      <td className="px-3 py-3.5 text-neutral-500 whitespace-nowrap">
                        {formatDateTime(bill.createdAt, 'dd/MM/yyyy HH:mm')}
                      </td>

                      {/* Order Type */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                            bill.orderType === 'dine-in'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}
                        >
                          {bill.orderType}
                        </span>
                      </td>

                      {/* Table Number */}
                      <td className="px-3 py-3.5 text-neutral-700 font-mono font-medium">
                        {bill.tableNumber || '—'}
                      </td>

                      {/* Cashier */}
                      <td className="px-3 py-3.5 text-neutral-600">
                        <span className="block truncate max-w-[120px]" title={bill.cashierName}>
                          {bill.cashierName}
                        </span>
                      </td>

                      {/* Subtotal */}
                      <td className="px-3 py-3.5 text-right font-medium text-neutral-600">
                        {fmt(bill.subtotal)}
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-3.5 text-right font-medium text-neutral-500">
                        {bill.discountAmount > 0 ? (
                          <span className="text-amber-700">-{fmt(bill.discountAmount)}</span>
                        ) : (
                          '₹0'
                        )}
                      </td>

                      {/* GST */}
                      <td className="px-3 py-3.5 text-right font-medium text-neutral-600">
                        {fmt(totalGst)}
                      </td>

                      {/* Grand Total */}
                      <td className="px-3 py-3.5 text-right font-bold text-neutral-900">
                        {fmt(bill.grandTotal)}
                      </td>

                      {/* Paid */}
                      <td className="px-3 py-3.5 text-right font-semibold text-emerald-600">
                        {fmt(bill.totalPaid)}
                      </td>

                      {/* Balance */}
                      <td className="px-3 py-3.5 text-right font-medium text-neutral-600">
                        {bill.balance > 0 ? (
                          <span className="text-red-600 font-semibold">{fmt(bill.balance)}</span>
                        ) : (
                          '₹0'
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            PAYMENT_STATUS_COLORS[bill.paymentStatus] || 'bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[bill.paymentStatus] || bill.paymentStatus}
                        </span>
                      </td>

                      {/* Bill Status */}
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${
                            BILL_STATUS_COLORS[bill.status] || 'bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Details / Receipt */}
                          <button
                            type="button"
                            onClick={() => setSelectedBill(bill)}
                            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition shadow-2xs"
                            title="View receipt details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Admin-only Cancel Bill Action */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setBillToCancel(bill);
                                setCancelReason('');
                              }}
                              disabled={isCancelled}
                              className={`p-1.5 rounded-lg border transition shadow-2xs ${
                                isCancelled
                                  ? 'border-neutral-200 text-neutral-300 cursor-not-allowed bg-neutral-50'
                                  : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                              }`}
                              title={isCancelled ? 'Bill already cancelled' : 'Cancel bill (Admin only)'}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Controls ────────────────────────────────────────── */}
        {!loading && bills.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-neutral-50/50 border-t border-neutral-200 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-neutral-200 rounded px-2 py-1 text-xs bg-white text-neutral-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-500">
                Page <span className="font-semibold text-neutral-800">{page}</span> of{' '}
                <span className="font-semibold text-neutral-800">{totalPages}</span>
              </span>

              <div className="inline-flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Detailed Receipt Modal ─────────────────────────────────────── */}
      {selectedBill && (
        <BillReceiptModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
      )}

      {/* ── Admin Bill Cancellation Modal ──────────────────────────────── */}
      {billToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-red-600">
                <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Ban className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-neutral-900">Cancel Bill Confirmation</h3>
              </div>
              <button
                type="button"
                onClick={() => setBillToCancel(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-600">
              <p>
                Are you sure you want to cancel bill{' '}
                <span className="font-mono font-bold text-neutral-900">{billToCancel.billNumber}</span>?
              </p>

              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Grand Total:</span>
                  <span className="font-bold">{fmt(billToCancel.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Paid:</span>
                  <span className="font-bold text-emerald-600">{fmt(billToCancel.totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <span className="uppercase font-semibold">{billToCancel.paymentStatus}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <strong>Policy Notice:</strong> Cancelling marks this bill as void in history. Historic
                item snapshots and payment transaction logs are strictly preserved. This action does not
                process an automated payment refund.
              </div>

              <div className="space-y-1 pt-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer requested refund, billing mistake, wrong discount applied…"
                  className="w-full p-2.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setBillToCancel(null)}
                disabled={cancelling}
                className="px-3 py-2 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color = 'neutral' }) {
  const colors = {
    neutral: 'text-neutral-900 bg-neutral-50',
    emerald: 'text-emerald-700 bg-emerald-50',
    amber: 'text-amber-700 bg-amber-50',
    red: 'text-red-700 bg-red-50',
    rose: 'text-rose-700 bg-rose-50',
  };
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-neutral-500 truncate">{label}</p>
        <p className="text-base font-bold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}
