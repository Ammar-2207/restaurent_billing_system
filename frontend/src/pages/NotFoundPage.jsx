import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <span className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">
        404 Error
      </span>
      <h1 className="text-3xl font-bold text-neutral-900 mt-2">
        Page Not Found
      </h1>
      <p className="text-neutral-500 text-sm max-w-sm mt-2">
        The requested endpoint or view does not exist in the system routing table.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
