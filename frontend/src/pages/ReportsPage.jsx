import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  UtensilsCrossed,
  Receipt,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Ban,
  Clock,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getDailySalesReport,
  getPaymentReport,
  getItemSalesReport,
  getDayEndReport,
} from '../services/reportService';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import VegIndicator from '../components/menu/VegIndicator';

const fmt = (n) => formatCurrency(n ?? 0);

// Preset date ranges helper
const getPresetRange = (preset) => {
  const now = new Date();
  // IST offset
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayStr = istNow.toISOString().slice(0, 10);

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === 'yesterday') {
    const yest = new Date(istNow.getTime() - 24 * 60 * 60 * 1000);
    const yestStr = yest.toISOString().slice(0, 10);
    return { startDate: yestStr, endDate: yestStr };
  }
  if (preset === '7days') {
    const past7 = new Date(istNow.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { startDate: past7.toISOString().slice(0, 10), endDate: todayStr };
  }
  if (preset === 'month') {
    const firstDay = `${todayStr.slice(0, 8)}01`;
    return { startDate: firstDay, endDate: todayStr };
  }
  return { startDate: todayStr, endDate: todayStr };
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Active tab: 'sales' | 'payments' | 'items' | 'dayend'
  const [activeTab, setActiveTab] = useState('sales');

  // Date filters
  const [preset, setPreset] = useState('today');
  const [startDate, setStartDate] = useState(() => getPresetRange('today').startDate);
  const [endDate, setEndDate] = useState(() => getPresetRange('today').endDate);

  // Data states
  const [salesData, setSalesData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [itemData, setItemData] = useState(null);
  const [dayEndData, setDayEndData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Item sorting & search
  const [itemSortBy, setItemSortBy] = useState('quantity');
  const [itemSearch, setItemSearch] = useState('');

  // Day-end report target date
  const [dayEndDate, setDayEndDate] = useState(() => getPresetRange('today').startDate);

  const printRef = useRef(null);

  // ── Load report data based on active tab ──────────────────────────────────
  const loadReports = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const params = { startDate, endDate };

      if (activeTab === 'sales') {
        const res = await getDailySalesReport(params);
        setSalesData(res.data.data);
      } else if (activeTab === 'payments') {
        const res = await getPaymentReport(params);
        setPaymentData(res.data.data);
      } else if (activeTab === 'items') {
        const res = await getItemSalesReport({
          ...params,
          sortBy: itemSortBy,
          search: itemSearch,
        });
        setItemData(res.data.data);
      } else if (activeTab === 'dayend') {
        const res = await getDayEndReport({ date: dayEndDate });
        setDayEndData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, activeTab, startDate, endDate, itemSortBy, itemSearch, dayEndDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handle Preset change
  const handlePresetSelect = (selectedPreset) => {
    setPreset(selectedPreset);
    if (selectedPreset !== 'custom') {
      const range = getPresetRange(selectedPreset);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      if (selectedPreset === 'today' || selectedPreset === 'yesterday') {
        setDayEndDate(range.startDate);
      }
    }
  };

  // Printable Day-End Handler
  const handlePrintDayEnd = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=750,height=900');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Day-End Closing Report - ${dayEndDate}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 12px;
              color: #171717;
              padding: 24px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header { text-align: center; border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; }
            .subtitle { font-size: 12px; color: #525252; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
            .kpi-box { border: 1px solid #e5e5e5; padding: 10px; border-radius: 6px; }
            .kpi-label { font-size: 10px; color: #737373; text-transform: uppercase; font-weight: 600; }
            .kpi-val { font-size: 16px; font-weight: bold; margin-top: 4px; }
            .section-title { font-size: 13px; font-weight: bold; margin: 16px 0 8px 0; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
            th { text-align: left; padding: 6px 8px; border-bottom: 1.5px solid #171717; background-color: #f5f5f5; }
            td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
            .right { text-align: right; }
            .footer { margin-top: 32px; border-top: 1px dashed #a3a3a3; padding-top: 12px; text-align: center; font-size: 10px; color: #737373; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  // If user is Cashier, deny access
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Access Restricted</h2>
        <p className="text-xs text-neutral-500">
          Financial sales reports and executive analytics are restricted strictly to Administrators.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Sales Reports & Analytics
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-white">
              Admin Suite
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              IST (Asia/Kolkata)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Aggregated revenue reporting, tax audits, payment distributions, and day-end closing sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium border border-neutral-200 px-3 py-2 rounded-lg hover:bg-neutral-50 transition"
            title="Reload current report"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* ── Filter & Preset Selector Card ───────────────────────────────── */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  preset === p.id
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Picker inputs */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-neutral-600">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <span>Range:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="border border-neutral-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
            />
            <span className="text-neutral-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="border border-neutral-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
            />
          </div>
        </div>
      </div>

      {/* ── Tabbed Report Views ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 space-x-6 text-xs font-semibold">
          {[
            { id: 'sales', label: 'Daily Sales & Taxes', icon: DollarSign },
            { id: 'payments', label: 'Payment Mode Report', icon: CreditCard },
            { id: 'items', label: 'Item-wise Sales Report', icon: UtensilsCrossed },
            { id: 'dayend', label: 'Printable Day-End Closing', icon: Printer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 flex items-center gap-2 transition border-b-2 ${
                  isSelected
                    ? 'border-neutral-900 text-neutral-900 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Loading Indicator */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
            <Loader2 className="h-7 w-7 animate-spin text-neutral-900" />
            <p className="text-xs">Aggregating report dataset from MongoDB…</p>
          </div>
        ) : (
          <>
            {/* ── TAB 1: Daily Sales & Taxes ─────────────────────────────── */}
            {activeTab === 'sales' && salesData && (
              <DailySalesTab summary={salesData.summary} period={salesData.reportingPeriod} />
            )}

            {/* ── TAB 2: Payment Mode Report ────────────────────────────── */}
            {activeTab === 'payments' && paymentData && (
              <PaymentModeTab data={paymentData} />
            )}

            {/* ── TAB 3: Item-wise Sales Report ─────────────────────────── */}
            {activeTab === 'items' && itemData && (
              <ItemSalesTab
                itemData={itemData}
                sortBy={itemSortBy}
                setSortBy={setItemSortBy}
                search={itemSearch}
                setSearch={setItemSearch}
              />
            )}

            {/* ── TAB 4: Printable Day-End Closing ──────────────────────── */}
            {activeTab === 'dayend' && (
              <DayEndTab
                data={dayEndData}
                dayEndDate={dayEndDate}
                setDayEndDate={setDayEndDate}
                printRef={printRef}
                onPrint={handlePrintDayEnd}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: Tab 1 — Daily Sales & Taxes
// ─────────────────────────────────────────────────────────────
function DailySalesTab({ summary, period }) {
  return (
    <div className="space-y-6">
      {/* Top Financial Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase">
            Total Billed Sales
          </span>
          <div className="text-2xl font-bold text-neutral-900">{fmt(summary.totalBilledSales)}</div>
          <p className="text-[11px] text-neutral-400">Sum of grand totals of valid bills</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">
            Total Amount Collected
          </span>
          <div className="text-2xl font-bold text-emerald-600">{fmt(summary.totalCollected)}</div>
          <p className="text-[11px] text-neutral-400">Actual money recorded in transactions</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase">
            Outstanding Balance
          </span>
          <div
            className={`text-2xl font-bold ${
              summary.outstandingBalance > 0 ? 'text-red-600' : 'text-neutral-900'
            }`}
          >
            {fmt(summary.outstandingBalance)}
          </div>
          <p className="text-[11px] text-neutral-400">Pending collections on open bills</p>
        </div>
      </div>

      {/* Bill Lifecycle Stats & Tax Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bill Lifecycle Counts */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-2">
            Bill Counts & Settlement Status
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Total Valid Bills Generated</span>
              <span className="font-bold text-neutral-900">{summary.totalBills}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Fully Settled (Paid) Bills</span>
              <span className="font-bold text-emerald-600">{summary.completedBills}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Partially Paid Bills</span>
              <span className="font-bold text-amber-600">{summary.partiallyPaidBills}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Unpaid Bills</span>
              <span className="font-bold text-red-600">{summary.unpaidBills}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Cancelled / Voided Bills</span>
              <span className="font-bold text-neutral-400 line-through">
                {summary.cancelledBills}
              </span>
            </div>
            <div className="flex justify-between py-1 font-semibold pt-1">
              <span className="text-neutral-800">Average Bill Value</span>
              <span className="font-bold text-neutral-900">{fmt(summary.averageBillValue)}</span>
            </div>
          </div>
        </div>

        {/* GST & Discount Breakdown */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-2">
            Subtotal, Discounts & GST Breakdown
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Items Gross Subtotal</span>
              <span className="font-bold text-neutral-900">{fmt(summary.totalSubtotal)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Discounts Conceded</span>
              <span className="font-bold text-amber-700">-{fmt(summary.totalDiscounts)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">CGST @ 2.5%</span>
              <span className="font-bold text-neutral-800">{fmt(summary.totalCGST)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">SGST @ 2.5%</span>
              <span className="font-bold text-neutral-800">{fmt(summary.totalSGST)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Total GST Collected (5%)</span>
              <span className="font-bold text-neutral-900">
                {fmt(Number((summary.totalCGST + summary.totalSGST).toFixed(2)))}
              </span>
            </div>
            <div className="flex justify-between py-1 font-semibold pt-1">
              <span className="text-neutral-900 font-bold">Net Grand Total Billed</span>
              <span className="font-bold text-neutral-900 text-sm">{fmt(summary.totalBilledSales)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: Tab 2 — Payment Mode Report
// ─────────────────────────────────────────────────────────────
function PaymentModeTab({ data }) {
  const modes = data.modes || [];
  const total = data.totalCollected || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {modes.map((m) => {
          const Icon = m.mode === 'cash' ? Banknote : m.mode === 'upi' ? Smartphone : CreditCard;
          const colors = {
            cash: 'border-emerald-200 bg-emerald-50/40 text-emerald-800',
            upi: 'border-violet-200 bg-violet-50/40 text-violet-800',
            card: 'border-blue-200 bg-blue-50/40 text-blue-800',
          };
          return (
            <div
              key={m.mode}
              className={`border rounded-2xl p-5 shadow-2xs space-y-2 ${colors[m.mode] || 'border-neutral-200 bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">{m.label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-extrabold">{fmt(m.amount)}</div>
              <div className="flex justify-between items-center text-[11px] opacity-80 pt-1 border-t border-current/10">
                <span>{m.count} transaction(s)</span>
                <span className="font-semibold">{m.percentage}% of total</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Percentage Distribution Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Collection Channel Distribution</h3>
          <span className="text-xs font-bold text-neutral-900">Total: {fmt(total)}</span>
        </div>

        {total === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            No payment transactions found in this date range
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-neutral-100">
              {modes.map((m) => {
                const barColors = { cash: '#10b981', upi: '#8b5cf6', card: '#3b82f6' };
                if (m.percentage <= 0) return null;
                return (
                  <div
                    key={m.mode}
                    style={{
                      width: `${m.percentage}%`,
                      backgroundColor: barColors[m.mode] || '#737373',
                    }}
                    title={`${m.label}: ${fmt(m.amount)} (${m.percentage}%)`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              {modes.map((m) => (
                <div key={m.mode} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        m.mode === 'cash' ? '#10b981' : m.mode === 'upi' ? '#8b5cf6' : '#3b82f6',
                    }}
                  />
                  <span className="font-medium text-neutral-700">{m.label}:</span>
                  <span className="font-semibold text-neutral-900">{fmt(m.amount)}</span>
                  <span className="text-[10px] text-neutral-400">({m.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: Tab 3 — Item-wise Sales Report
// ─────────────────────────────────────────────────────────────
function ItemSalesTab({ itemData, sortBy, setSortBy, search, setSearch }) {
  const items = itemData.items || [];
  const summary = itemData.summary || {};

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-60 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search dish by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 font-medium">Sort By:</span>
          <button
            type="button"
            onClick={() => setSortBy('quantity')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              sortBy === 'quantity'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Quantity Sold
          </button>
          <button
            type="button"
            onClick={() => setSortBy('amount')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              sortBy === 'amount'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Sales Amount (₹)
          </button>
        </div>
      </div>

      {/* Item Sales Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xs overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            No items sold in the selected reporting period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-medium">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Item Name</th>
                  <th className="text-right py-3 px-4">Rate Snapshot</th>
                  <th className="text-right py-3 px-4">Quantity Sold</th>
                  <th className="text-right py-3 px-4">Total Revenue</th>
                  <th className="text-right py-3 px-4">Quantity Share</th>
                  <th className="text-right py-3 px-4">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <VegIndicator foodType={item.foodType} size="sm" />
                        <span className="font-semibold text-neutral-900">{item.itemName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-600">
                      {fmt(item.unitPriceSnapshot)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                      {item.quantitySold}x
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-neutral-900">
                      {fmt(item.totalSalesAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-600 font-medium">
                      {item.quantityContribution}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                        {item.salesContribution}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: Tab 4 — Day-End Closing Report & Print
// ─────────────────────────────────────────────────────────────
function DayEndTab({ data, dayEndDate, setDayEndDate, printRef, onPrint }) {
  if (!data) {
    return (
      <div className="py-16 text-center text-xs text-neutral-400">
        Loading day-end summary sheet…
      </div>
    );
  }

  const { financials, topSellingItems, cashierBreakdown } = data;

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-neutral-700">Select Date for Day-End Closing:</span>
          <input
            type="date"
            value={dayEndDate}
            onChange={(e) => setDayEndDate(e.target.value)}
            className="border border-neutral-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3.5 py-2 rounded-lg hover:bg-neutral-800 transition shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1.5 text-xs font-semibold border border-neutral-200 text-neutral-700 px-3.5 py-2 rounded-lg hover:bg-neutral-50 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
        <div ref={printRef} className="space-y-6">
          {/* Printable Header */}
          <div className="header text-center border-b-2 border-neutral-900 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              🍽️ {data.restaurantName}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Official Day-End Financial Closing & Audit Summary
            </p>
            <div className="flex justify-center gap-4 text-[11px] text-neutral-400 mt-2 font-mono">
              <span>Closing Date: {data.reportDate}</span>
              <span>•</span>
              <span>Generated: {formatDateTime(data.generatedAt, 'dd/MM/yyyy HH:mm:ss')} IST</span>
            </div>
          </div>

          {/* Core Financial Totals */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              1. Revenue & Settlement Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                  Total Billed Sales
                </span>
                <p className="text-base font-bold text-neutral-900 mt-1">
                  {fmt(financials.totalBilledSales)}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 bg-emerald-50/50 text-emerald-800">
                <span className="text-[10px] uppercase font-semibold">Total Collections</span>
                <p className="text-base font-bold mt-1">{fmt(financials.totalCollected)}</p>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                  Outstanding Balance
                </span>
                <p className="text-base font-bold text-red-600 mt-1">
                  {fmt(financials.outstandingBalance)}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                  Total Bills Generated
                </span>
                <p className="text-base font-bold text-neutral-900 mt-1">{financials.totalBills}</p>
              </div>
            </div>
          </div>

          {/* Payment Collection Channels */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              2. Payment Collection Channels
            </h3>
            <table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-semibold text-neutral-600">
                <tr>
                  <th className="text-left p-2.5">Payment Mode</th>
                  <th className="text-right p-2.5">Amount Collected</th>
                  <th className="text-right p-2.5">Channel Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="p-2.5 font-medium">Cash Collections</td>
                  <td className="p-2.5 text-right font-bold text-neutral-900">
                    {fmt(financials.cashCollected)}
                  </td>
                  <td className="p-2.5 text-right text-neutral-500">
                    {financials.totalCollected > 0
                      ? (
                          (financials.cashCollected / financials.totalCollected) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">UPI QR Collections</td>
                  <td className="p-2.5 text-right font-bold text-neutral-900">
                    {fmt(financials.upiCollected)}
                  </td>
                  <td className="p-2.5 text-right text-neutral-500">
                    {financials.totalCollected > 0
                      ? (
                          (financials.upiCollected / financials.totalCollected) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Card POS Collections</td>
                  <td className="p-2.5 text-right font-bold text-neutral-900">
                    {fmt(financials.cardCollected)}
                  </td>
                  <td className="p-2.5 text-right text-neutral-500">
                    {financials.totalCollected > 0
                      ? (
                          (financials.cardCollected / financials.totalCollected) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr className="bg-neutral-50/70 font-bold border-t border-neutral-200">
                  <td className="p-2.5">Total Settlement Collected</td>
                  <td className="p-2.5 text-right text-emerald-700">
                    {fmt(financials.totalCollected)}
                  </td>
                  <td className="p-2.5 text-right">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Audit Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              3. GST Tax Summary (5% Total)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded border border-neutral-100 bg-neutral-50/40">
                <span className="text-[10px] text-neutral-500">Gross Subtotal:</span>
                <p className="font-semibold text-neutral-900">{fmt(financials.totalSubtotal)}</p>
              </div>
              <div className="p-2.5 rounded border border-neutral-100 bg-neutral-50/40">
                <span className="text-[10px] text-neutral-500">Total Discounts:</span>
                <p className="font-semibold text-amber-700">-{fmt(financials.totalDiscounts)}</p>
              </div>
              <div className="p-2.5 rounded border border-neutral-100 bg-neutral-50/40">
                <span className="text-[10px] text-neutral-500">CGST (2.5%):</span>
                <p className="font-semibold text-neutral-900">{fmt(financials.totalCGST)}</p>
              </div>
              <div className="p-2.5 rounded border border-neutral-100 bg-neutral-50/40">
                <span className="text-[10px] text-neutral-500">SGST (2.5%):</span>
                <p className="font-semibold text-neutral-900">{fmt(financials.totalSGST)}</p>
              </div>
            </div>
          </div>

          {/* Top 5 Dishes */}
          {topSellingItems?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                4. Top Sold Items
              </h3>
              <table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
                <thead className="bg-neutral-50 border-b border-neutral-200 font-semibold text-neutral-600">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {topSellingItems.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium">{item.itemName}</td>
                      <td className="p-2 text-right font-mono font-bold">{item.quantitySold}x</td>
                      <td className="p-2 text-right font-semibold">
                        {fmt(item.totalSalesAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signoff Footer */}
          <div className="footer pt-4 border-t border-dashed border-neutral-300 text-center text-[10px] text-neutral-400 space-y-1">
            <p>Certified daily financial audit export for {data.reportDate} IST.</p>
            <p>Admin Sign-off: ________________________ &nbsp;&nbsp;&nbsp;&nbsp; Date & Time: ________________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}
