import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Settings,
  Store,
  Receipt,
  Activity,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  Database,
  Clock,
  Cpu,
  Building,
  Phone,
  Mail,
  MapPin,
  Tag,
  Percent,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  getSettings,
  updateSettings,
  getDiagnostics,
} from '../services/settingsService';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Settings form state
  const [form, setForm] = useState({
    restaurantName: 'RestoBill Restaurant & Cafe',
    tagline: 'Modern Multi-Cuisine Dining & POS',
    contactPhone: '+91 98765 43210',
    contactEmail: 'billing@restobill.com',
    address: 'Plot 42, Bandra West, Mumbai, Maharashtra 400050',
    gstin: '27AABCU9603R1ZM',
    currencySymbol: '₹',
    defaultGstRate: 5,
    cgstRate: 2.5,
    sgstRate: 2.5,
    billPrefix: 'BILL-',
    timezone: 'Asia/Kolkata',
    enableRoundOff: true,
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      const payload = res.data?.data || res.data;
      if (payload) {
        setForm({
          restaurantName: payload.restaurantName || '',
          tagline: payload.tagline || '',
          contactPhone: payload.contactPhone || '',
          contactEmail: payload.contactEmail || '',
          address: payload.address || '',
          gstin: payload.gstin || '',
          currencySymbol: payload.currencySymbol || '₹',
          defaultGstRate: payload.defaultGstRate ?? 5,
          cgstRate: payload.cgstRate ?? 2.5,
          sgstRate: payload.sgstRate ?? 2.5,
          billPrefix: payload.billPrefix || 'BILL-',
          timezone: payload.timezone || 'Asia/Kolkata',
          enableRoundOff: payload.enableRoundOff ?? true,
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiagnosticsData = useCallback(async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await getDiagnostics();
      setDiagnostics(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to fetch diagnostics:', err);
    } finally {
      setLoadingDiagnostics(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadDiagnosticsData();
  }, [loadSettings, loadDiagnosticsData]);

  // Handle GST change to automatically split into CGST and SGST
  const handleGstChange = (val) => {
    const rate = parseFloat(val) || 0;
    setForm({
      ...form,
      defaultGstRate: rate,
      cgstRate: Number((rate / 2).toFixed(2)),
      sgstRate: Number((rate / 2).toFixed(2)),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSettings(form);
      toast.success(res.data?.message || 'Settings saved successfully!');
    } catch (err) {
      toast.error(err.data?.message || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setForm({
      restaurantName: 'RestoBill Restaurant & Cafe',
      tagline: 'Modern Multi-Cuisine Dining & POS',
      contactPhone: '+91 98765 43210',
      contactEmail: 'billing@restobill.com',
      address: 'Plot 42, Bandra West, Mumbai, Maharashtra 400050',
      gstin: '27AABCU9603R1ZM',
      currencySymbol: '₹',
      defaultGstRate: 5,
      cgstRate: 2.5,
      sgstRate: 2.5,
      billPrefix: 'BILL-',
      timezone: 'Asia/Kolkata',
      enableRoundOff: true,
    });
    toast('Values reset to factory defaults. Click "Save Settings" to apply.', { icon: 'ℹ️' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <span>System Settings & Configuration</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                Configuration Suite
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customize restaurant identity, tax rates, invoice parameters, and inspect runtime server diagnostics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 text-xs font-medium transition shadow-2xs"
            title="Reset to baseline defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 text-xs font-medium transition shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition -mb-px ${
            activeTab === 'profile'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Restaurant Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tax')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition -mb-px ${
            activeTab === 'tax'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Taxation & Billing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition -mb-px ${
            activeTab === 'diagnostics'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Diagnostics & Runtime</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          <p className="text-xs text-neutral-500">Loading system settings…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* TAB 1: Restaurant Profile */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-semibold text-neutral-900">Establishment Profile</h2>
                  <p className="text-[11px] text-neutral-500">
                    These branding details appear on customer invoices, printed receipts, and system reports.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Restaurant Legal Name *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={form.restaurantName}
                        onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Tagline / Slogan</label>
                    <input
                      type="text"
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Contact Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        value={form.contactPhone}
                        onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Contact Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-neutral-700 mb-1">Physical Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                      <textarea
                        rows={2}
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">GSTIN Number (15 digits)</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={form.gstin}
                      onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono uppercase text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      value={form.currencySymbol}
                      onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 text-xs font-medium transition shadow-xs disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Restaurant Profile</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Taxation & Billing */}
            {activeTab === 'tax' && (
              <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-sm font-semibold text-neutral-900">Taxation & Invoicing Rules</h2>
                  <p className="text-[11px] text-neutral-500">
                    Configure standard GST percentages, sequential invoice numbering prefixes, and round-off calculation rules.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Total GST Rate (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={form.defaultGstRate}
                        onChange={(e) => handleGstChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Split equally as Central GST (CGST) and State GST (SGST).
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Invoice Number Prefix</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        value={form.billPrefix}
                        onChange={(e) => setForm({ ...form, billPrefix: e.target.value.toUpperCase() })}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/15 font-mono uppercase text-[11px]"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      e.g. {form.billPrefix}20261123-0001
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Central GST (CGST %)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled
                      value={form.cgstRate}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">State GST (SGST %)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled
                      value={form.sgstRate}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Reporting Timezone</label>
                    <input
                      type="text"
                      disabled
                      value={form.timezone}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-500 font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Fixed to Indian Standard Time (IST, UTC+5:30) for accounting conformity.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <input
                      type="checkbox"
                      id="roundOffCheckbox"
                      checked={form.enableRoundOff}
                      onChange={(e) => setForm({ ...form, enableRoundOff: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <label htmlFor="roundOffCheckbox" className="font-medium text-neutral-800 cursor-pointer">
                      Enable Round-off to Nearest Rupee
                      <span className="block text-[10px] text-neutral-400 font-normal">
                        Rounds grand total and displays the fractional differential on receipt.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 text-xs font-medium transition shadow-xs disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Billing Rules</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Diagnostics & Runtime */}
            {activeTab === 'diagnostics' && (
              <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">Runtime Health & Environment</h2>
                    <p className="text-[11px] text-neutral-500">
                      Real-time server infrastructure telemetry, database connection health, and node specifications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadDiagnosticsData}
                    disabled={loadingDiagnostics}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
                    title="Refresh telemetry"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingDiagnostics && !diagnostics ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                  </div>
                ) : diagnostics ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Database Telemetry */}
                    <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 space-y-2">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <Database className="h-4 w-4 text-emerald-600" />
                        <span>MongoDB Atlas Telemetry</span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px] text-neutral-600">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Connection State:</span>
                          <span className="text-emerald-700 font-semibold">{diagnostics.database?.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Cluster Host:</span>
                          <span className="truncate max-w-[150px]">{diagnostics.database?.host}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Target Database:</span>
                          <span>{diagnostics.database?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Ping Latency:</span>
                          <span>{diagnostics.database?.pingLatencyMs} ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Server Telemetry */}
                    <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 space-y-2">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <Server className="h-4 w-4 text-blue-600" />
                        <span>Node.js Backend Runtime</span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px] text-neutral-600">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Node Version:</span>
                          <span className="font-semibold">{diagnostics.server?.nodeVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">OS Architecture:</span>
                          <span>{diagnostics.server?.platform} ({diagnostics.server?.arch})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Process Uptime:</span>
                          <span>{diagnostics.server?.uptime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Memory RSS:</span>
                          <span>{diagnostics.server?.memoryRssMb} MB</span>
                        </div>
                      </div>
                    </div>

                    {/* System Clock & Timezone */}
                    <div className="sm:col-span-2 p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 space-y-2">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span>System Clocks & Timezone Reference</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-neutral-600">
                        <div>
                          <span className="text-neutral-400 block text-[10px]">UTC ISO Standard:</span>
                          <span>{diagnostics.systemTime?.utc}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Indian Standard Time (IST):</span>
                          <span className="text-neutral-900 font-semibold">{diagnostics.systemTime?.localFormatted}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">Diagnostics unavailable</p>
                )}
              </div>
            )}
          </div>

          {/* Right Pane: Live Receipt Branding Preview */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-neutral-800 font-semibold text-xs border-b border-neutral-100 pb-2">
                <FileText className="h-4 w-4 text-neutral-500" />
                <span>Live Receipt Header Preview</span>
              </div>

              {/* Receipt Visual Sandbox */}
              <div className="p-4 rounded-lg bg-neutral-50 border border-dashed border-neutral-300 font-mono text-center text-xs space-y-1">
                <div className="font-bold text-neutral-900 text-sm tracking-wide uppercase">
                  {form.restaurantName || 'Restaurant Name'}
                </div>
                <div className="text-[11px] text-neutral-500 italic">
                  {form.tagline || 'Tagline'}
                </div>
                <div className="text-[10px] text-neutral-500 pt-1">
                  {form.address || 'Address'}
                </div>
                <div className="text-[10px] text-neutral-500">
                  Phone: {form.contactPhone || '—'}
                </div>
                <div className="text-[10px] text-neutral-600 font-semibold pt-1">
                  GSTIN: {form.gstin || 'NOT SPECIFIED'}
                </div>
                <div className="border-b border-neutral-300 border-dashed my-2" />
                <div className="flex justify-between text-[11px] text-neutral-700">
                  <span>BILL NO: {form.billPrefix}XXXX-0001</span>
                  <span>TABLE: T1</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>CGST ({form.cgstRate}%) + SGST ({form.sgstRate}%)</span>
                  <span>GST: {form.defaultGstRate}%</span>
                </div>
                <div className="border-b border-neutral-300 border-dashed my-2" />
                <div className="text-[10px] text-neutral-400 italic">
                  *** Thank You! Visit Again ***
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Changes saved here dynamically adjust receipts printed from the POS, Billing & Payments, and Bills History modules.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
