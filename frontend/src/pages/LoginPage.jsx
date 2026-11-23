import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  UtensilsCrossed,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Target path after login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both username/email and password.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(identifier, password);
      toast.success(`Welcome back, ${loggedInUser.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err.message || 'Login failed. Please check your credentials.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill helper for evaluator convenience
  const fillCredentials = (role) => {
    if (role === 'admin') {
      setIdentifier('admin');
      setPassword('Admin@123');
    } else {
      setIdentifier('cashier');
      setPassword('Cashier@123');
    }
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-md">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-neutral-900">
          Restaurant Billing System
        </h2>
        <p className="mt-1 text-center text-xs text-neutral-500">
          Sign in to access point-of-sale and restaurant management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-neutral-200/80 shadow-xs">
          {/* Error Message Box */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span className="font-semibold block shrink-0">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Username / Email field */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin or cashier"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 placeholder:text-neutral-400 transition"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-neutral-900 placeholder:text-neutral-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-sm font-medium transition shadow-xs disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium mb-2.5">
              <KeyRound className="h-3.5 w-3.5 text-neutral-400" />
              <span>Demo Quick-Fill Accounts:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-left transition"
              >
                <div className="font-semibold text-neutral-800 flex items-center gap-1">
                  <span>Admin</span>
                  <span className="text-[10px] px-1 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                    Full
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">
                  admin / Admin@123
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('cashier')}
                className="p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-left transition"
              >
                <div className="font-semibold text-neutral-800 flex items-center gap-1">
                  <span>Cashier</span>
                  <span className="text-[10px] px-1 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                    POS
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">
                  cashier / Cashier@123
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>JWT Protected & Bcrypt Hashed</span>
        </div>
      </div>
    </div>
  );
}
