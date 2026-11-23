import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Server,
  Database,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Lock,
  BookOpen,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';

export default function HomePage() {
  const { user } = useAuth();

  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // RBAC test states
  const [testResult, setTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(null);

  const fetchHealth = async (showToast = false) => {
    setLoadingHealth(true);
    try {
      const response = await api.get('/health');
      setHealth(response.data);
      if (showToast) {
        toast.success('System health check completed successfully');
      }
    } catch (err) {
      setHealth({
        success: false,
        status: 'unreachable',
        message: err.message || 'Failed to connect to backend server',
        mongodb: { status: 'unknown' },
      });
      if (showToast) {
        toast.error('Health check failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth(false);
  }, []);

  // Run live RBAC test against backend endpoints
  const runRbacTest = async (endpoint, label) => {
    setTestingEndpoint(endpoint);
    try {
      const response = await api.get(endpoint);
      setTestResult({
        endpoint,
        label,
        status: 200,
        success: true,
        message: response.data.message,
        payload: response.data,
      });
      toast.success(`Success (HTTP 200): Access granted to ${label}`);
    } catch (error) {
      const statusCode = error.status || 403;
      setTestResult({
        endpoint,
        label,
        status: statusCode,
        success: false,
        message: error.message,
        payload: error.data || { error: error.message },
      });
      if (statusCode === 403) {
        toast.error(`Forbidden (HTTP 403): Role '${user?.role}' is restricted.`);
      } else {
        toast.error(`Error (${statusCode}): ${error.message}`);
      }
    } finally {
      setTestingEndpoint(null);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* User Welcome Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Welcome back, {user?.name}!
              </h2>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                {user?.role} Account
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Signed in as <span className="font-medium text-neutral-700">@{user?.username}</span> ({user?.email}). Role-Based Access Control is enforced.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition shadow-xs"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{isAdmin ? 'Manage Menu' : 'Browse Menu'}</span>
          </Link>
          <button
            type="button"
            onClick={() => fetchHealth(true)}
            disabled={loadingHealth}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-xs font-medium text-neutral-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            <span>{loadingHealth ? 'Checking...' : 'Refresh Health'}</span>
          </button>
        </div>
      </div>

      {/* RBAC Live Interactive Verification Section */}
      <Card
        title="Role-Based Access Control (RBAC) Verification"
        subtitle="Verify that API security and role permissions are strictly enforced according to your active role"
      >
        <div className="space-y-5">
          <p className="text-xs text-neutral-600">
            Click the buttons below to fire authenticated requests carrying your Bearer JWT token to test role restrictions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Admin-only endpoint button */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-800">
                    Admin Protected API
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    admin only
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Endpoint: <code className="text-neutral-700 font-mono">GET /api/auth/admin-only</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => runRbacTest('/auth/admin-only', 'Admin Endpoint')}
                disabled={testingEndpoint === '/auth/admin-only'}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>
                  {testingEndpoint === '/auth/admin-only'
                    ? 'Testing...'
                    : 'Test Admin-Only Access'}
                </span>
              </button>
            </div>

            {/* Cashier + Admin endpoint button */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-800">
                    Billing Operations API
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    admin + cashier
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Endpoint: <code className="text-neutral-700 font-mono">GET /api/auth/cashier-access</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  runRbacTest('/auth/cashier-access', 'Cashier/Billing Endpoint')
                }
                disabled={testingEndpoint === '/auth/cashier-access'}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition shadow-2xs disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  {testingEndpoint === '/auth/cashier-access'
                    ? 'Testing...'
                    : 'Test Billing Access'}
                </span>
              </button>
            </div>
          </div>

          {/* Test Output Panel */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                testResult.success
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-red-50/70 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>
                    {testResult.label}: HTTP {testResult.status} {testResult.success ? 'OK' : 'Forbidden'}
                  </span>
                </div>
                <span className="font-mono text-[11px] opacity-75">
                  {testResult.endpoint}
                </span>
              </div>
              <p className="text-xs opacity-90">{testResult.message}</p>
              <pre className="p-2.5 rounded bg-white/80 border border-neutral-200/50 font-mono text-[11px] overflow-x-auto text-neutral-800">
                {JSON.stringify(testResult.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Connectivity Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Backend API Service Card */}
        <Card
          title="Express Backend API"
          subtitle="Node.js & Express service running on port 5000"
          action={
            <StatusBadge
              status={health?.status === 'healthy'}
              label={health?.status === 'healthy' ? 'API Online' : 'Degraded'}
            />
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                <Server className="h-5 w-5 text-neutral-700" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-xs text-neutral-500">Service Endpoint</div>
                <div className="text-sm font-mono text-neutral-800 bg-neutral-100/70 px-2 py-1 rounded text-xs truncate">
                  GET http://localhost:5000/api/health
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-neutral-500 block">Response Message:</span>
                <span className="font-medium text-neutral-800 truncate block mt-0.5">
                  {health?.message || (loadingHealth ? 'Probing...' : 'No response')}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Server Uptime:</span>
                <span className="font-medium text-neutral-800 block mt-0.5">
                  {health?.uptime || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* MongoDB Database Connection Card */}
        <Card
          title="MongoDB Atlas Database"
          subtitle="Managed Document Store via Mongoose"
          action={
            <StatusBadge
              status={health?.mongodb?.status === 'connected'}
              label={
                health?.mongodb?.status === 'connected'
                  ? 'Connected'
                  : 'Disconnected'
              }
            />
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Database className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-xs text-neutral-500">Mongoose ReadyState</div>
                <div className="text-sm font-semibold text-neutral-800 capitalize">
                  {health?.mongodb?.status ||
                    (loadingHealth ? 'Connecting...' : 'Disconnected')}
                  <span className="text-xs text-neutral-400 font-normal ml-2">
                    (State Code: {health?.mongodb?.readyState ?? 'N/A'})
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-neutral-500 block">Environment:</span>
                <span className="font-medium text-neutral-800 capitalize block mt-0.5">
                  {health?.environment || 'development'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Database Status:</span>
                <span className="font-medium text-neutral-800 capitalize block mt-0.5">
                  {health?.mongodb?.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Phase 1 Architecture Summary Card */}
      <Card
        title="Phase 1 Implementation: Completed Architecture"
        subtitle="Full authentication stack with JWT, bcryptjs password hashing, and role-based access control"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Backend Authentication Services</span>
            </div>
            <ul className="text-neutral-600 space-y-1 pl-5 list-disc text-[11px]">
              <li>User model with bcryptjs hash pre-save hook</li>
              <li>POST /api/auth/login with express-validator</li>
              <li>GET /api/auth/me protected by JWT middleware</li>
              <li>POST /api/auth/logout session termination</li>
              <li>Automatic database seeder (admin & cashier)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Frontend Authentication Flow</span>
            </div>
            <ul className="text-neutral-600 space-y-1 pl-5 list-disc text-[11px]">
              <li>AuthProvider context managing user session & token</li>
              <li>Axios interceptor attaching Bearer JWT header</li>
              <li>ProtectedRoute route guards for authentication & roles</li>
              <li>Modern minimal LoginPage with quick-fill demo pills</li>
              <li>Role-aware Sidebar and Header with Logout button</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
