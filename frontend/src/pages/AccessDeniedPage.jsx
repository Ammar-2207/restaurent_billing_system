import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
        403 Forbidden
      </span>
      <h1 className="text-2xl font-bold text-neutral-900 mt-3">
        Access Restricted
      </h1>
      <p className="text-neutral-500 text-sm max-w-md mt-2">
        Your current role does not have permission to view or manage this section.
        Cashiers can access billing, orders, and order history only. Administrative
        management requires an Admin account.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
