import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Ban,
  Clock,
  ShoppingBag,
  RefreshCw,
  UtensilsCrossed,
  LayoutGrid,
  FileText,
  BookOpen,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardSummary,
  getDashboardPaymentSummary,
  getDashboardTopItems,
  getDashboardSalesTrend,
} from '../services/reportService';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import VegIndicator from '../components/menu/VegIndicator';

const fmt = (n) => formatCurrency(n ?? 0);

const PAYMENT_COLORS = {
  cash: '#10b981', // Emerald
  upi: '#8b5cf6',  // Violet
  card: '#3b82f6', // Blue
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Admin Dashboard States
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [sumRes, payRes, topRes, trendRes] = await Promise.all([
        getDashboardSummary(),
        getDashboardPaymentSummary(),
        getDashboardTopItems({ limit: 5 }),
        getDashboardSalesTrend({ days: 7 }),
      ]);

      setSummary(sumRes.data.data);
      setPayments(payRes.data.data.breakdown || []);
      setTopItems(topRes.data.data || []);
      setSalesTrend(trendRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // If user is Cashier, show the operational Cashier Portal
  if (!isAdmin) {
    return <CashierDashboard user={user} navigate={navigate} />;
  }

  const kpis = summary?.kpis;
  const comparisons = kpis?.comparisons;

  // Doughnut chart data for payments
  const pieData = payments.map((p) => ({
    name: p.label,
    value: p.amount,
    color: PAYMENT_COLORS[p.mode] || '#6b7280',
    percentage: p.percentage,
  }));

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Executive Dashboard
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-white">
              Admin View
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              IST (Asia/Kolkata)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time financial analytics, revenue settlement, and culinary performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium border border-neutral-200 px-3 py-2 rounded-lg hover:bg-neutral-50 transition"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 text-xs font-medium bg-neutral-900 text-white px-3 py-2 rounded-lg hover:bg-neutral-800 transition shadow-2xs"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Detailed Reports</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-400 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-900" />
          <p className="text-xs font-medium">Computing live financial aggregates…</p>
        </div>
      ) : (
        <>
          {/* ── 8 KPI Cards Grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Today's Billed Sales */}
            <KpiCard
              label="Today's Billed Sales"
              value={fmt(kpis?.todayBilledSales)}
              subtitle="Grand total of generated bills"
              icon={Receipt}
              color="neutral"
              comparison={comparisons?.sales}
            />

            {/* 2. Today's Collected Amount */}
            <KpiCard
              label="Amount Collected"
              value={fmt(kpis?.todayCollected)}
              subtitle="Actual payments received"
              icon={CheckCircle2}
              color="emerald"
              comparison={comparisons?.collections}
            />

            {/* 3. Today's Outstanding Balance */}
            <KpiCard
              label="Outstanding Balance"
              value={fmt(kpis?.todayOutstandingBalance)}
              subtitle="Pending on unpaid / partial bills"
              icon={AlertCircle}
              color={kpis?.todayOutstandingBalance > 0 ? 'amber' : 'neutral'}
            />

            {/* 4. Average Bill Value */}
            <KpiCard
              label="Average Bill Value"
              value={fmt(kpis?.averageBillValue)}
              subtitle="Billed sales / active bills"
              icon={TrendingUp}
              color="blue"
            />

            {/* 5. Total Bills */}
            <KpiCard
              label="Today's Total Bills"
              value={kpis?.todayTotalBills ?? 0}
              subtitle="Non-cancelled bills generated"
              icon={Layers}
              color="neutral"
            />

            {/* 6. Completed Bills */}
            <KpiCard
              label="Completed Bills"
              value={kpis?.todayCompletedBills ?? 0}
              subtitle="Fully settled bills"
              icon={CheckCircle2}
              color="emerald"
            />

            {/* 7. Cancelled Bills */}
            <KpiCard
              label="Cancelled Bills"
              value={kpis?.todayCancelledBills ?? 0}
              subtitle="Voided (excluded from sales)"
              icon={Ban}
              color="rose"
            />

            {/* 8. Today's Orders */}
            <KpiCard
              label="Today's Orders"
              value={kpis?.todayOrders ?? 0}
              subtitle="Dine-In & Takeaway created"
              icon={ShoppingBag}
              color="neutral"
            />
          </div>

          {/* ── Charts Row: 7-Day Trend & Payment Summary ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Day Sales Trend (2 Columns) */}
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900">7-Day Sales & Collections Trend</h2>
                    <p className="text-[11px] text-neutral-500">
                      Billed sales vs cash/digital collections in Asia/Kolkata
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                {salesTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                    No sales data available for the last 7 days
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <XAxis dataKey="label" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#a3a3a3"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip
                        formatter={(val, name) => [
                          fmt(val),
                          name === 'billedSales' ? 'Billed Sales' : 'Collected',
                        ]}
                        contentStyle={{
                          backgroundColor: '#171717',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '11px',
                          border: 'none',
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                      />
                      <Bar dataKey="billedSales" name="Billed Sales" fill="#171717" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="amountCollected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment Summary Doughnut (1 Column) */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                      <PieIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-neutral-900">Payment Breakdown</h2>
                      <p className="text-[11px] text-neutral-500">Collected: {fmt(totalCollected)}</p>
                    </div>
                  </div>
                </div>

                <div className="h-44 w-full relative flex items-center justify-center pt-2">
                  {totalCollected === 0 ? (
                    <div className="text-center text-xs text-neutral-400">
                      No collections recorded today
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => fmt(v)}
                          contentStyle={{
                            backgroundColor: '#171717',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '11px',
                            border: 'none',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Mode Breakdown Legend List */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 text-xs">
                {payments.map((p) => {
                  const Icon =
                    p.mode === 'cash' ? Banknote : p.mode === 'upi' ? Smartphone : CreditCard;
                  return (
                    <div key={p.mode} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: PAYMENT_COLORS[p.mode] }}
                        />
                        <Icon className="h-3.5 w-3.5 text-neutral-500" />
                        <span className="font-medium text-neutral-700">{p.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-neutral-900">{fmt(p.amount)}</span>
                        <span className="text-[10px] text-neutral-400 ml-1.5">
                          ({p.percentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Top-Selling Menu Items Row ───────────────────────────────── */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Today's Top-Selling Dishes</h2>
                  <p className="text-[11px] text-neutral-500">
                    Based on verified non-cancelled order item snapshots
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 flex items-center gap-1 transition"
              >
                <span>Full Item Report</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {topItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-400">
                No menu items billed today yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 text-neutral-400 font-medium">
                      <th className="text-left py-2 px-3">#</th>
                      <th className="text-left py-2 px-3">Item Name</th>
                      <th className="text-right py-2 px-3">Quantity Sold</th>
                      <th className="text-right py-2 px-3">Sales Amount</th>
                      <th className="text-right py-2 px-3">Top Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {topItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-neutral-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <VegIndicator foodType={item.foodType} size="sm" />
                            <span className="font-semibold text-neutral-800">{item.itemName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                          {item.quantitySold}x
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-neutral-900">
                          {fmt(item.totalSalesAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                            {item.percentageOfTop}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: KPI Card
// ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, subtitle, icon: Icon, color = 'neutral', comparison }) {
  const colorStyles = {
    neutral: 'bg-neutral-50 text-neutral-900',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${colorStyles[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div>
        <div className="text-xl font-bold tracking-tight text-neutral-900">{value}</div>
        {subtitle && <p className="text-[10px] text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>

      {comparison && (
        <div className="pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-[11px]">
          {comparison.direction === 'up' && (
            <span className="inline-flex items-center text-emerald-600 font-semibold">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +{comparison.percentage}%
            </span>
          )}
          {comparison.direction === 'down' && (
            <span className="inline-flex items-center text-rose-600 font-semibold">
              <TrendingDown className="h-3 w-3 mr-0.5" />
              -{comparison.percentage}%
            </span>
          )}
          {comparison.direction === 'neutral' && (
            <span className="text-neutral-400 font-medium">0.0% vs yesterday</span>
          )}
          <span className="text-neutral-400 text-[10px]">vs yesterday</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: Cashier Operational View (No Financial Analytics)
// ─────────────────────────────────────────────────────────────
function CashierDashboard({ user, navigate }) {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Cashier Portal
          </span>
          <h1 className="text-xl font-bold text-neutral-900 mt-2">
            Welcome back, {user?.name || 'Cashier'}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Access tables, create dine-in/takeaway orders, and process customer bills.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CashierActionCard
          title="Tables Floor"
          description="View active 10 restaurant tables and live order status"
          icon={LayoutGrid}
          onClick={() => navigate('/tables')}
        />
        <CashierActionCard
          title="Point of Sale"
          description="Punch new takeaway or table orders into kitchen"
          icon={Receipt}
          onClick={() => navigate('/pos')}
        />
        <CashierActionCard
          title="Orders Ledger"
          description="Track running orders and proceed to settlement"
          icon={FileText}
          onClick={() => navigate('/orders')}
        />
        <CashierActionCard
          title="Billing & Payment"
          description="Generate GST bills, apply discounts and collect cash/UPI/card"
          icon={DollarSign}
          onClick={() => navigate('/billing')}
        />
      </div>
    </div>
  );
}

function CashierActionCard({ title, description, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl p-5 shadow-2xs transition group space-y-3"
    >
      <div className="h-10 w-10 rounded-xl bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center transition">
        <Icon className="h-5 w-5 text-neutral-700 group-hover:text-white" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
        <p className="text-xs text-neutral-500 mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-neutral-900 pt-1">
        <span>Open module</span>
        <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}
