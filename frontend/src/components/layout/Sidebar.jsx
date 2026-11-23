import { NavLink } from 'react-router-dom';
import {
  UtensilsCrossed,
  LayoutDashboard,
  LayoutGrid,
  Receipt,
  FileText,
  BookOpen,
  Users,
  Settings,
  X,
  ShieldCheck,
  LogOut,
  IndianRupee,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();

  // Role-aware navigation definitions
  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'cashier'],
    },
    {
      name: 'Tables Floor',
      path: '/tables',
      icon: LayoutGrid,
      badge: '10 Tables',
      allowedRoles: ['admin', 'cashier'],
    },
    {
      name: 'Point of Sale',
      path: '/pos',
      icon: Receipt,
      badge: 'Live',
      allowedRoles: ['admin', 'cashier'],
    },
    {
      name: 'Orders Ledger',
      path: '/orders',
      icon: FileText,
      allowedRoles: ['admin', 'cashier'],
    },
    {
      name: 'Billing & Payment',
      path: '/billing',
      icon: IndianRupee,
      badge: 'GST',
      allowedRoles: ['admin', 'cashier'],
    },
    {
      name: 'Bills History',
      path: '/bills',
      icon: ClipboardList,
      allowedRoles: ['admin', 'cashier'],
    },
    {
      name: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      badge: 'Admin',
      allowedRoles: ['admin'],
    },
    {
      name: 'Menu Catalog',
      path: '/menu',
      icon: BookOpen,
      badge: isAdmin ? 'Admin' : 'POS',
      allowedRoles: ['admin', 'cashier'],
    },
    {
      name: 'Staff & Roles',
      path: '/staff',
      icon: Users,
      badge: 'Admin',
      allowedRoles: ['admin'], // Admin only
    },
    {
      name: 'System Settings',
      path: '/settings',
      icon: Settings,
      badge: 'Config',
      allowedRoles: ['admin'], // Admin only
    },
  ];

  // Filter navigation items accessible to current user role
  const visibleItems = navigationItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand identity */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-neutral-900 text-sm tracking-tight block">
                RestoBill
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                Management Suite
              </span>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden text-neutral-400 hover:text-neutral-600 p-1"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Navigation ({user?.role?.toUpperCase() || 'GUEST'})
          </div>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isPlaceholder = item.path.startsWith('#');
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive && !isPlaceholder
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : isPlaceholder
                      ? 'text-neutral-400 cursor-not-allowed hover:bg-neutral-50'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                      item.badge === 'Admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : item.badge === 'POS'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : item.badge === 'Live'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                        : item.badge === 'GST'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Identity & Logout in Sidebar Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs text-neutral-800 truncate">
                {user?.name}
              </p>
              <p className="text-[11px] text-neutral-500 capitalize">
                Role: {user?.role}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>JWT Auth & RBAC Active</span>
          </div>
        </div>
      </aside>
    </>
  );
}
