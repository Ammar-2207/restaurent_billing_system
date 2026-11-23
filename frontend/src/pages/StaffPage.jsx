import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  User,
  ShieldAlert,
} from 'lucide-react';
import {
  getStaff,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
} from '../services/staffService';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';

export default function StaffPage() {
  const { user: currentUser } = useAuth();

  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    cashiers: 0,
    active: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'cashier',
  });
  const [showPassword, setShowPassword] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStaff();
      const payload = res.data || res;
      setStaffList(payload.data || []);
      if (payload.stats) {
        setStats(payload.stats);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
      toast.error(err.message || 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Filtered staff
  const filteredStaff = staffList.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.username?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q);

    const matchesRole = roleFilter === 'All' || s.role === roleFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'active' ? s.isActive : !s.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle Add Staff
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    try {
      await createStaff(formData);
      toast.success(`Staff member "${formData.name}" created successfully!`);
      setShowAddModal(false);
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'cashier',
      });
      loadStaff();
    } catch (err) {
      toast.error(err.data?.message || err.message || 'Failed to create staff member');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      username: staff.username,
      email: staff.email,
      password: '',
      role: staff.role,
    });
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;

    setSubmitting(true);
    try {
      const updatePayload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password.trim()) {
        updatePayload.password = formData.password.trim();
      }

      await updateStaff(editingStaff.id || editingStaff._id, updatePayload);
      toast.success(`Updated details for "${formData.name}"`);
      setShowEditModal(false);
      setEditingStaff(null);
      loadStaff();
    } catch (err) {
      toast.error(err.data?.message || err.message || 'Failed to update staff member');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (staff) => {
    const isSelf = (currentUser?.id || currentUser?._id) === (staff.id || staff._id);
    if (isSelf) {
      toast.error('You cannot deactivate your own active session');
      return;
    }

    try {
      await toggleStaffStatus(staff.id || staff._id);
      toast.success(
        `Staff member "${staff.name}" is now ${staff.isActive ? 'Deactivated' : 'Active'}`
      );
      loadStaff();
    } catch (err) {
      toast.error(err.data?.message || err.message || 'Failed to change account status');
    }
  };

  // Delete Staff
  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;
    setSubmitting(true);
    try {
      await deleteStaff(deletingStaff.id || deletingStaff._id);
      toast.success(`Staff member "${deletingStaff.name}" has been removed`);
      setDeletingStaff(null);
      loadStaff();
    } catch (err) {
      toast.error(err.data?.message || err.message || 'Failed to delete staff member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <span>Staff & Role Management</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Admin Control
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Manage system users, assign administrative or cashier privileges, and control account statuses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStaff}
            disabled={loading}
            className="p-2 text-neutral-500 hover:text-neutral-900 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition shadow-2xs"
            title="Refresh Directory"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: '',
                username: '',
                email: '',
                password: '',
                role: 'cashier',
              });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Total Staff</span>
            <Users className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.total}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Registered team members</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Cashiers</span>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.cashiers}</div>
          <div className="text-[11px] text-neutral-400 mt-1">POS & billing operators</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Administrators</span>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Full management access</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Active Accounts</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {stats.inactive > 0 ? `${stats.inactive} deactivated` : 'All accounts operational'}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by staff name, username, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80">
            {['All', 'admin', 'cashier'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                  roleFilter === role
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {role === 'All' ? 'All Roles' : role}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80">
            {['All', 'active', 'inactive'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                  statusFilter === st
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {st === 'All' ? 'All Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            <p className="text-xs text-neutral-500">Loading staff directory…</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Users className="h-8 w-8 text-neutral-300 mx-auto" />
            <p className="text-sm font-medium text-neutral-700">No staff members found</p>
            <p className="text-xs text-neutral-400">
              {search || roleFilter !== 'All' || statusFilter !== 'All'
                ? 'Try adjusting your search criteria or role filters.'
                : 'Click "Add Staff Member" to invite your first team member.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Contact Email</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredStaff.map((staff) => {
                  const isCurrent =
                    (currentUser?.id || currentUser?._id) === (staff.id || staff._id);
                  const isMasterAdmin = staff.username === 'admin';

                  return (
                    <tr key={staff.id || staff._id} className="hover:bg-neutral-50/60 transition">
                      {/* Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-neutral-900 text-white font-semibold flex items-center justify-center text-xs shadow-2xs">
                            {staff.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded border border-neutral-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-neutral-400 font-mono text-[11px]">
                              @{staff.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-neutral-600 font-mono">
                        {staff.email}
                      </td>

                      {/* Role Pill */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                            staff.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {staff.role === 'admin' ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          <span>{staff.role}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                            staff.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              staff.isActive ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}
                          />
                          <span>{staff.isActive ? 'Active' : 'Deactivated'}</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                        {staff.createdAt ? formatDateTime(staff.createdAt) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(staff)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                            title="Edit Staff Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(staff)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent
                                ? 'text-neutral-300 cursor-not-allowed'
                                : staff.isActive
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={
                              isCurrent
                                ? 'Cannot deactivate self'
                                : staff.isActive
                                ? 'Deactivate account'
                                : 'Activate account'
                            }
                          >
                            {staff.isActive ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingStaff(staff)}
                            disabled={isCurrent || isMasterAdmin}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent || isMasterAdmin
                                ? 'text-neutral-300 cursor-not-allowed'
                                : 'text-red-500 hover:bg-red-50'
                            }`}
                            title={
                              isMasterAdmin
                                ? 'Master admin cannot be deleted'
                                : isCurrent
                                ? 'Cannot delete self'
                                : 'Delete staff member'
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Add New Staff Member</h3>
                  <p className="text-[11px] text-neutral-400">Create staff credentials and set role permissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rahul_s"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">System Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-medium"
                  >
                    <option value="cashier">Cashier (POS & Billing)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    placeholder="rahul@restaurant.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Initial Password * (min 6 characters)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-9 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 font-medium disabled:opacity-50 shadow-xs"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Edit Staff Member</h3>
                  <p className="text-[11px] text-neutral-400">Update profile details or reset password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Username</label>
                  <input
                    type="text"
                    disabled
                    value={formData.username}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-400 font-mono text-[11px] cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-medium"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Reset Password <span className="text-neutral-400 font-normal">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password (optional)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-9 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 font-medium disabled:opacity-50 shadow-xs"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-neutral-200 shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-5 w-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900">Delete Staff Account?</h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to delete <span className="font-semibold text-neutral-900">{deletingStaff.name}</span> (@{deletingStaff.username})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="flex-1 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
