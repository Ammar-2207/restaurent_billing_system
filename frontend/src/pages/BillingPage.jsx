import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Receipt,
  Search,
  RefreshCw,
  ChevronDown,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Smartphone,
  Banknote,
  Loader2,
  Tag,
  Calculator,
} from 'lucide-react';
import { getOrders, getOrderById } from '../services/orderService';
import { createBill, getBillByOrderId, addPayment } from '../services/billService';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import BillReceiptModal from '../components/billing/BillReceiptModal';

// ─── Payment mode config ───────────────────────────────────────────────────
const PAYMENT_MODES = [
  { key: 'cash', label: 'Cash', icon: Banknote, color: 'emerald' },
  { key: 'upi', label: 'UPI', icon: Smartphone, color: 'violet' },
  { key: 'card', label: 'Card', icon: CreditCard, color: 'blue' },
];

// ─── Helper: Format INR compactly ─────────────────────────────────────────
const fmt = (n) => formatCurrency(n ?? 0);

export default function BillingPage() {
  const [searchParams] = useSearchParams();

  // Order selection
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Bill state
  const [currentBill, setCurrentBill] = useState(null);
  const [loadingBill, setLoadingBill] = useState(false);

  // Discount
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');

  // Payment
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);

  // Receipt modal
  const [showReceipt, setShowReceipt] = useState(false);

  // ── Load running orders ──────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await getOrders({ status: 'running' });
      const ordersList = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setOrders(ordersList);
    } catch (err) {
      console.error('Failed to load running orders:', err);
      toast.error(err?.message || 'Failed to load running orders');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ── Auto-select order from URL param (from POS page or Orders page) ────
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId) return;

    if (orders.length > 0) {
      const order = orders.find((o) => o.id === orderId || o._id === orderId);
      if (order) {
        handleSelectOrder(order);
        return;
      }
    }

    // Fallback: fetch directly by ID if not in loaded list
    getOrderById(orderId)
      .then((res) => {
        const orderData = res.data || res;
        if (orderData && (orderData.id || orderData._id)) {
          handleSelectOrder(orderData);
        }
      })
      .catch((err) => {
        console.warn('Could not auto-select order by ID:', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, orders]);

  // ── Select an order and check for existing bill ──────────────────────────
  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setCurrentBill(null);
    setDiscountType('none');
    setDiscountValue('');
    setPaymentMode('cash');
    setPaymentAmount('');
    setPaymentRef('');

    setLoadingBill(true);
    try {
      const res = await getBillByOrderId(order.id || order._id);
      setCurrentBill(res.data?.data || res.data);
    } catch (err) {
      const status = err.status || err.response?.status;
      if (status !== 404) {
        toast.error(err.message || 'Error checking for existing bill');
      }
      setCurrentBill(null);
    } finally {
      setLoadingBill(false);
    }
  };

  // ── Generate Bill ────────────────────────────────────────────────────────
  const handleGenerateBill = async () => {
    if (!selectedOrder) return;

    const dv = parseFloat(discountValue) || 0;

    if (discountType === 'percentage' && (dv < 0 || dv > 100)) {
      toast.error('Percentage discount must be between 0 and 100');
      return;
    }

    setLoadingBill(true);
    try {
      const res = await createBill(selectedOrder.id || selectedOrder._id, {
        discountType,
        discountValue: dv,
      });
      const billData = res.data?.data || res.data;
      setCurrentBill(billData);
      toast.success(`Bill ${billData.billNumber} generated!`);
    } catch (err) {
      const status = err.status || err.response?.status;
      const msg = err.data?.message || err.message || err.response?.data?.message || 'Failed to generate bill';
      if (status === 409) {
        // Already billed — load it
        setCurrentBill(err.data?.data || err.response?.data?.data);
        toast('Bill already exists for this order', { icon: 'ℹ️' });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoadingBill(false);
    }
  };

  // ── Add Payment ──────────────────────────────────────────────────────────
  const handleAddPayment = async () => {
    if (!currentBill) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    const balance = Number((currentBill.grandTotal - currentBill.totalPaid).toFixed(2));
    if (amount > balance + 0.01) {
      toast.error(`Amount exceeds outstanding balance of ${fmt(balance)}`);
      return;
    }

    setAddingPayment(true);
    try {
      const res = await addPayment(currentBill.id || currentBill._id, {
        paymentMode,
        amount,
        referenceNumber: paymentRef.trim(),
      });
      const updatedBill = res.data?.data || res.data;
      setCurrentBill(updatedBill);
      setPaymentAmount('');
      setPaymentRef('');

      if (updatedBill.paymentStatus === 'paid') {
        toast.success('Bill fully settled! Order completed.');
        // Refresh running orders list
        await loadOrders();
        setSelectedOrder(null);
        setShowReceipt(true);
      } else {
        toast.success(`Payment recorded. Balance: ${fmt(updatedBill.balance)}`);
      }
    } catch (err) {
      const msg = err.data?.message || err.message || err.response?.data?.message || 'Failed to record payment';
      toast.error(msg);
    } finally {
      setAddingPayment(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────
  const filteredOrders = (Array.isArray(orders) ? orders : []).filter((o) => {
    const q = (orderSearch || '').trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderNumber?.toLowerCase()?.includes(q) ||
      o.table?.tableNumber?.toLowerCase()?.includes(q) ||
      o.orderType?.toLowerCase()?.includes(q)
    );
  });

  const balance = currentBill
    ? Number((currentBill.grandTotal - currentBill.totalPaid).toFixed(2))
    : 0;

  const isFullyPaid = currentBill?.paymentStatus === 'paid';

  // ── Preview financials before generating bill ────────────────────────────
  const previewFinancials = (() => {
    if (!selectedOrder || currentBill) return null;
    const subtotal = selectedOrder.subtotal || 0;
    const dv = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (discountType === 'percentage') discountAmount = (subtotal * dv) / 100;
    else if (discountType === 'fixed') discountAmount = Math.min(dv, subtotal);
    const taxable = subtotal - discountAmount;
    const cgst = (taxable * 2.5) / 100;
    const sgst = (taxable * 2.5) / 100;
    const beforeRoundOff = taxable + cgst + sgst;
    const grand = Math.round(beforeRoundOff);
    const roundOff = grand - beforeRoundOff;
    return {
      subtotal,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxable: Number(taxable.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      beforeRoundOff: Number(beforeRoundOff.toFixed(2)),
      roundOff: Number(roundOff.toFixed(2)),
      grand,
    };
  })();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Billing & Payments</h1>
            <p className="text-xs text-neutral-500">Generate bills, apply GST and collect payments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Order Selector ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-800">Select Running Order</h2>
              <button
                type="button"
                onClick={loadOrders}
                disabled={loadingOrders}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                title="Refresh running orders"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search order number or table…"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
            </div>

            {loadingOrders ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                <span className="text-xs text-neutral-400">Loading running orders…</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-neutral-400 space-y-2">
                <p>No running orders found</p>
                <button
                  type="button"
                  onClick={loadOrders}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh list</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {filteredOrders.map((order) => (
                  <button
                    key={order.id || order._id}
                    onClick={() => handleSelectOrder(order)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-xs ${
                      selectedOrder?.id === order.id || selectedOrder?._id === order._id
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 hover:border-neutral-400 text-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{order.orderNumber}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          order.orderType === 'dine-in'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        } ${selectedOrder?.id === order.id ? 'bg-opacity-80' : ''}`}
                      >
                        {order.orderType === 'dine-in'
                          ? order.table?.tableNumber || 'Dine-In'
                          : 'Takeaway'}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1 opacity-80">
                      <span>{order.items?.length} item(s)</span>
                      <span className="font-medium">{fmt(order.subtotal)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Discount Panel (shown when order selected and no bill yet) ── */}
          {selectedOrder && !currentBill && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-neutral-600" />
                <h2 className="text-sm font-semibold text-neutral-800">Discount</h2>
              </div>

              <div className="flex gap-2">
                {['none', 'percentage', 'fixed'].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setDiscountType(t); setDiscountValue(''); }}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                      discountType === t
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                    }`}
                  >
                    {t === 'none' ? 'None' : t === 'percentage' ? '%' : '₹ Fixed'}
                  </button>
                ))}
              </div>

              {discountType !== 'none' && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                    {discountType === 'percentage' ? '%' : '₹'}
                  </span>
                  <input
                    type="number"
                    placeholder={discountType === 'percentage' ? '0–100' : 'Amount'}
                    value={discountValue}
                    min={0}
                    max={discountType === 'percentage' ? 100 : selectedOrder.subtotal}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Bill & Payment Panel ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedOrder ? (
            <div className="bg-white border border-neutral-200 rounded-xl flex items-center justify-center min-h-64">
              <div className="text-center space-y-2">
                <Calculator className="h-10 w-10 text-neutral-200 mx-auto" />
                <p className="text-sm text-neutral-400">Select a running order to generate a bill</p>
              </div>
            </div>
          ) : loadingBill ? (
            <div className="bg-white border border-neutral-200 rounded-xl flex items-center justify-center min-h-64">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              {/* ── Bill Summary Card ─────────────────────────────────────── */}
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {currentBill ? currentBill.billNumber : `Order: ${selectedOrder.orderNumber}`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {selectedOrder.orderType === 'dine-in'
                        ? `Table ${selectedOrder.table?.tableNumber || '—'}`
                        : 'Takeaway'}
                      {currentBill && ` · ${formatDateTime(currentBill.createdAt)}`}
                    </p>
                  </div>
                  {currentBill && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isFullyPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : currentBill.paymentStatus === 'partially_paid'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {isFullyPaid ? 'PAID' : currentBill.paymentStatus === 'partially_paid' ? 'PARTIAL' : 'UNPAID'}
                    </span>
                  )}
                </div>

                {/* Items table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-neutral-50">
                        <th className="text-left px-5 py-2 text-neutral-500 font-medium">Item</th>
                        <th className="text-center px-3 py-2 text-neutral-500 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 text-neutral-500 font-medium">Rate</th>
                        <th className="text-right px-5 py-2 text-neutral-500 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {(currentBill?.items || selectedOrder.items || []).map((item, idx) => (
                        <tr key={item.id || item._id || idx} className="hover:bg-neutral-50/50">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  item.foodType === 'veg' ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                              />
                              <span className="text-neutral-800 font-medium">{item.itemName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-neutral-600">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-neutral-600">{fmt(item.price)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-neutral-900">
                            {fmt(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial breakdown */}
                <div className="px-5 py-4 border-t border-neutral-100 space-y-1.5">
                  {(() => {
                    const data = currentBill || previewFinancials;
                    if (!data) return null;
                    return (
                      <>
                        <FinRow label="Subtotal" value={fmt(data.subtotal)} />
                        {(data.discountAmount > 0 || data.discountType === 'percentage' || data.discountType === 'fixed') && (
                          <FinRow
                            label={`Discount${currentBill?.discountType === 'percentage' ? ` (${currentBill.discountValue}%)` : currentBill?.discountType === 'fixed' ? ' (Fixed)' : previewFinancials?.discountAmount > 0 ? ` (${discountType === 'percentage' ? discountValue + '%' : '₹' + discountValue})` : ''}`}
                            value={`-${fmt(data.discountAmount)}`}
                            className="text-orange-600"
                          />
                        )}
                        <FinRow label="Taxable Amount" value={fmt(data.taxableAmount ?? data.taxable)} />
                        <FinRow label="CGST (2.5%)" value={fmt(data.cgstAmount ?? data.cgst)} muted />
                        <FinRow label="SGST (2.5%)" value={fmt(data.sgstAmount ?? data.sgst)} muted />
                        <FinRow
                          label="Round-off"
                          value={(data.roundOff >= 0 ? '+' : '') + fmt(data.roundOff)}
                          muted
                        />
                        <div className="pt-2 mt-2 border-t border-neutral-200 flex justify-between items-center">
                          <span className="text-sm font-bold text-neutral-900">Grand Total</span>
                          <span className="text-lg font-bold text-neutral-900">
                            {fmt(data.grandTotal ?? data.grand)}
                          </span>
                        </div>
                        {currentBill && (
                          <>
                            <FinRow label="Total Paid" value={fmt(currentBill.totalPaid)} className="text-emerald-600" />
                            {!isFullyPaid && (
                              <FinRow label="Balance Due" value={fmt(balance)} className="text-red-600 font-semibold" />
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Generate Bill button */}
                {!currentBill && (
                  <div className="px-5 py-4 border-t border-neutral-100">
                    <button
                      onClick={handleGenerateBill}
                      disabled={loadingBill}
                      className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60 transition"
                    >
                      {loadingBill ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                      Generate Bill
                    </button>
                  </div>
                )}
              </div>

              {/* ── Payment Panel ─────────────────────────────────────────── */}
              {currentBill && !isFullyPaid && (
                <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-neutral-800">Record Payment</h2>

                  {/* Payment mode selector */}
                  <div className="flex gap-2">
                    {PAYMENT_MODES.map(({ key, label, icon: Icon, color }) => (
                      <button
                        key={key}
                        onClick={() => setPaymentMode(key)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMode === key
                            ? `bg-${color}-50 border-${color}-300 text-${color}-700`
                            : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Amount input */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">₹</span>
                      <input
                        type="number"
                        placeholder={`Max: ${balance}`}
                        value={paymentAmount}
                        min={0.01}
                        max={balance}
                        step={0.01}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                      />
                    </div>
                    {(paymentMode === 'upi' || paymentMode === 'card') && (
                      <input
                        type="text"
                        placeholder="Reference / TXN ID (optional)"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                      />
                    )}
                  </div>

                  {/* Quick-fill balance button */}
                  <button
                    onClick={() => setPaymentAmount(String(balance))}
                    className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                  >
                    Pay full balance ({fmt(balance)})
                  </button>

                  <button
                    onClick={handleAddPayment}
                    disabled={addingPayment}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    {addingPayment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Record Payment
                  </button>

                  {/* Payment history */}
                  {currentBill.payments?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                      <p className="text-xs text-neutral-500 font-medium">Payments Recorded</p>
                      {currentBill.payments.map((p, i) => (
                        <div
                          key={p.id || p._id || i}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="capitalize text-neutral-700 font-medium">{p.paymentMode}</span>
                            {p.referenceNumber && (
                              <span className="text-neutral-400">#{p.referenceNumber}</span>
                            )}
                          </div>
                          <span className="font-semibold text-emerald-600">{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Fully Paid: Receipt actions ───────────────────────────── */}
              {currentBill && isFullyPaid && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">Bill Fully Settled</span>
                  </div>
                  <p className="text-xs text-emerald-700 mb-4">
                    Order completed and table released. Total collected: {fmt(currentBill.totalPaid)}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReceipt(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
                    >
                      <Printer className="h-4 w-4" />
                      Print Receipt
                    </button>
                  </div>
                  {/* Payment history for paid bill */}
                  {currentBill.payments?.length > 0 && (
                    <div className="mt-4 space-y-1.5 pt-3 border-t border-emerald-200">
                      <p className="text-xs text-emerald-700 font-medium">Payment Breakdown</p>
                      {currentBill.payments.map((p, i) => (
                        <div key={p.id || i} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-emerald-700">{p.paymentMode}</span>
                          <span className="font-semibold text-emerald-800">{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Show receipt button for partially paid too */}
              {currentBill && !isFullyPaid && (
                <button
                  onClick={() => setShowReceipt(true)}
                  className="w-full flex items-center justify-center gap-2 border border-neutral-200 text-neutral-700 py-2 rounded-lg text-sm font-medium hover:bg-neutral-50 transition"
                >
                  <Printer className="h-4 w-4" />
                  Preview Receipt
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && currentBill && (
        <BillReceiptModal bill={currentBill} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}

// ─── Small helper component ────────────────────────────────────────────────
function FinRow({ label, value, muted = false, className = '' }) {
  return (
    <div className={`flex justify-between items-center text-xs ${muted ? 'text-neutral-500' : 'text-neutral-700'} ${className}`}>
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
