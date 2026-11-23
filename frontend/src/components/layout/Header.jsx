import { Menu, Activity, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-neutral-900">
            Restaurant Billing System
          </h1>
          <p className="text-xs text-neutral-500 hidden sm:block">
            Phase 1: Authentication & Role-Based Access Control
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Identity Pill */}
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
            <UserCircle className="h-4 w-4 text-neutral-500 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-neutral-800 leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] text-neutral-400 capitalize leading-tight">
                @{user.username}
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isAdmin
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              {user.role}
            </span>
          </div>
        )}

        {/* System Phase Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          <Activity className="h-3.5 w-3.5 text-emerald-600" />
          <span>Phase 1 Active</span>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-medium transition shadow-2xs"
          title="Sign out of system"
        >
          <LogOut className="h-3.5 w-3.5 text-neutral-500" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
