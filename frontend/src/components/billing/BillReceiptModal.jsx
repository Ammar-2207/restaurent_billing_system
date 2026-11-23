import { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const fmt = (n) => formatCurrency(n ?? 0);

/**
 * BillReceiptModal — Professional restaurant bill receipt
 * Supports Print and Download (via browser print-to-PDF)
 */
export default function BillReceiptModal({ bill, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.billNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0 auto;
              padding: 10px;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .large { font-size: 15px; }
            .xlarge { font-size: 18px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .solid { border-top: 1px solid #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 0; vertical-align: top; }
            .right { text-align: right; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .totals .row { font-weight: bold; }
            .grand { font-size: 14px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 4px 0; }
            .paid-stamp { text-align: center; font-size: 20px; font-weight: bold; border: 3px double #000; padding: 6px; margin: 8px 0; letter-spacing: 4px; }
            .cancelled-stamp { text-align: center; font-size: 18px; font-weight: bold; border: 3px double #dc2626; color: #dc2626; padding: 6px; margin: 8px 0; letter-spacing: 3px; }
            .cancel-box { background: #fef2f2; border: 1px solid #fecaca; padding: 6px; border-radius: 4px; margin: 6px 0; font-size: 10px; color: #991b1b; }
            .footer { text-align: center; margin-top: 10px; font-size: 11px; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleDownload = () => {
    // Open print dialog with PDF option
    handlePrint();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-semibold text-neutral-900">Bill Receipt</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 transition">
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Receipt content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            ref={printRef}
            className="font-mono text-xs text-neutral-900 space-y-1"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {/* Restaurant header */}
            <div className="center bold xlarge" style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
              🍽️ RESTOBILL
            </div>
            <div className="center" style={{ textAlign: 'center', color: '#555', fontSize: 11 }}>
              Restaurant Management System
            </div>
            <div className="center" style={{ textAlign: 'center', color: '#555', fontSize: 11 }}>
              GST Reg: 29AABCT3518Q1ZV
            </div>
            <div className="divider" style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />

            {/* Bill meta */}
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bill No:</span>
              <span className="bold" style={{ fontWeight: 'bold' }}>{bill.billNumber}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Order No:</span>
              <span>{bill.orderNumber}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date:</span>
              <span>{formatDateTime(bill.createdAt, 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Type:</span>
              <span className="bold" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                {bill.orderType === 'dine-in' ? `Dine-In (${bill.tableNumber || '—'})` : 'Takeaway'}
              </span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cashier:</span>
              <span>{bill.cashierName}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bill Status:</span>
              <span className="bold" style={{ fontWeight: 'bold', textTransform: 'uppercase', color: bill.status === 'cancelled' ? '#dc2626' : 'inherit' }}>
                {bill.status}
              </span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment Status:</span>
              <span className="bold" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                {bill.paymentStatus}
              </span>
            </div>
            <div className="divider" style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />

            {/* Items */}
            <div className="bold" style={{ fontWeight: 'bold', marginBottom: 4 }}>ITEMS</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: 2 }}>Item</th>
                  <th style={{ textAlign: 'center', paddingBottom: 2 }}>Qty</th>
                  <th style={{ textAlign: 'right', paddingBottom: 2 }}>Rate</th>
                  <th style={{ textAlign: 'right', paddingBottom: 2 }}>Amt</th>
                </tr>
              </thead>
              <tbody>
                {bill.items?.map((item, i) => (
                  <tr key={i}>
                    <td style={{ paddingRight: 4, paddingBottom: 2 }}>
                      {item.foodType === 'veg' ? '[V]' : '[N]'} {item.itemName}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="divider" style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />

            {/* Financial summary */}
            <div className="totals" style={{ fontSize: 11 }}>
              <ReceiptRow label="Subtotal" value={fmt(bill.subtotal)} />
              {bill.discountAmount > 0 && (
                <ReceiptRow
                  label={`Discount (${bill.discountType === 'percentage' ? bill.discountValue + '%' : 'Fixed'})`}
                  value={`-${fmt(bill.discountAmount)}`}
                />
              )}
              <ReceiptRow label="Taxable Amount" value={fmt(bill.taxableAmount)} />
              <ReceiptRow label={`CGST @ ${bill.cgstRate}%`} value={fmt(bill.cgstAmount)} />
              <ReceiptRow label={`SGST @ ${bill.sgstRate}%`} value={fmt(bill.sgstAmount)} />
              <ReceiptRow
                label="Round-off"
                value={(bill.roundOff >= 0 ? '+' : '') + fmt(bill.roundOff)}
              />
            </div>

            {/* Grand total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: 14,
                borderTop: '2px solid #000',
                borderBottom: '2px solid #000',
                padding: '4px 0',
                margin: '4px 0',
              }}
            >
              <span>GRAND TOTAL</span>
              <span>{fmt(bill.grandTotal)}</span>
            </div>

            {/* Payment breakdown */}
            {bill.payments?.length > 0 && (
              <>
                <div className="divider" style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />
                <div className="bold" style={{ fontWeight: 'bold', marginBottom: 4 }}>PAYMENT</div>
                {bill.payments.map((p, i) => (
                  <ReceiptRow
                    key={i}
                    label={p.paymentMode.toUpperCase() + (p.referenceNumber ? ` #${p.referenceNumber}` : '')}
                    value={fmt(p.amount)}
                  />
                ))}
                <ReceiptRow label="Total Paid" value={fmt(bill.totalPaid)} bold />
                {bill.balance > 0 && (
                  <ReceiptRow label="Balance Due" value={fmt(bill.balance)} />
                )}
              </>
            )}

            {/* Status stamps */}
            {bill.status === 'cancelled' && (
              <>
                <div
                  className="cancelled-stamp"
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: 18,
                    border: '3px double #dc2626',
                    color: '#dc2626',
                    padding: '6px',
                    margin: '8px 0',
                    letterSpacing: 3,
                  }}
                >
                  ✗ CANCELLED
                </div>
                <div
                  className="cancel-box"
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    margin: '6px 0',
                    fontSize: 10,
                    color: '#991b1b',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>CANCELLATION DETAILS:</div>
                  <div>Cancelled By: {bill.cancelledBy?.name || 'Administrator'}</div>
                  {bill.cancelledAt && <div>Date: {formatDateTime(bill.cancelledAt, 'dd/MM/yyyy HH:mm')}</div>}
                  <div>Reason: {bill.cancellationReason || 'No reason provided'}</div>
                  <div style={{ fontSize: 9, marginTop: 4, color: '#7f1d1d' }}>
                    * This bill has been voided. Cancellation does not process automated payment refunds.
                  </div>
                </div>
              </>
            )}

            {bill.status !== 'cancelled' && bill.paymentStatus === 'paid' && (
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: 20,
                  border: '3px double #16a34a',
                  color: '#16a34a',
                  padding: '6px',
                  margin: '8px 0',
                  letterSpacing: 4,
                }}
              >
                ✓ PAID
              </div>
            )}

            {bill.status !== 'cancelled' && bill.paymentStatus === 'partially_paid' && (
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: 13,
                  border: '2px dashed #d97706',
                  color: '#d97706',
                  padding: '6px',
                  margin: '8px 0',
                }}
              >
                PARTIAL PAYMENT
              </div>
            )}

            {/* Footer */}
            <div className="divider" style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            <div style={{ textAlign: 'center', fontSize: 11, color: '#666', lineHeight: 1.6 }}>
              <div>Thank you for dining with us!</div>
              <div>CGST + SGST = 5% GST Included</div>
              <div style={{ marginTop: 4 }}>{formatDateTime(bill.createdAt, 'dd/MM/yyyy HH:mm:ss')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, bold = false }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1px 0',
        fontWeight: bold ? 'bold' : 'normal',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
