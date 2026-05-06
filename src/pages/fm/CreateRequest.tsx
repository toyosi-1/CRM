import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowLeft, ClipboardList, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Priority, VendorType } from '../../types';
import { SLA_HOURS, formatCurrency } from '../../utils/helpers';

export default function CreateRequest() {
  const navigate = useNavigate();
  const { currentUser, vendors, assets, sites, createRequest } = useStore();
  const site = sites.find(s => s.id === currentUser?.siteId);
  const siteAssets = assets.filter(a => a.siteId === currentUser?.siteId);

  const [form, setForm] = useState({
    description: '',
    priority: 'medium' as Priority,
    vendorId: '',
    vendorType: 'recurring' as VendorType,
    invoiceAmount: '',
    assetId: '',
  });


  const selectedVendor = vendors.find(v => v.id === form.vendorId);
  const selectedAsset = assets.find(a => a.id === form.assetId);

  const remaining = site ? site.monthlyBudget - site.currentMonthSpend : 0;
  const invoiceAmt = parseFloat(form.invoiceAmount) || 0;
  const budgetWarning = invoiceAmt > 0 && invoiceAmt > remaining;

  const PRIORITY_OPTS: { value: Priority; label: string; desc: string; color: string }[] = [
    { value: 'low', label: 'Low', desc: 'Routine maintenance · 72h SLA', color: 'border-slate-300 bg-slate-50' },
    { value: 'medium', label: 'Medium', desc: 'Operational issue · 24h SLA', color: 'border-amber-300 bg-amber-50' },
    { value: 'high', label: 'High', desc: 'Serious problem · 8h SLA', color: 'border-orange-400 bg-orange-50' },
    { value: 'critical', label: 'Critical', desc: 'Urgent failure · 2h SLA', color: 'border-red-500 bg-red-50' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    createRequest({
      description: form.description,
      priority: form.priority,
      vendorId: form.vendorId || undefined,
      vendorName: selectedVendor?.name,
      vendorType: form.vendorType,
      invoiceAmount: invoiceAmt || undefined,
      assetId: form.assetId || undefined,
      assetName: selectedAsset?.name,
      isBudgetWarning: budgetWarning,
    });
    setTimeout(() => navigate('/fm/requests'), 300);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon"><ArrowLeft size={15} /></button>
        <div>
          <h1 className="page-title">New Maintenance Request</h1>
          <p className="page-subtitle">{site?.name} · Fill in all required fields</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Priority Selection */}
        <div className="card p-5">
          <label className="label">Priority Level *</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {PRIORITY_OPTS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, priority: opt.value }))}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.priority === opt.value
                    ? `${opt.color} shadow-sm`
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={10} />
                    <span>{SLA_HOURS[opt.value]}h SLA</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <ClipboardList size={15} className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Request Details</p>
              <p className="text-xs text-slate-400">All fields marked * are required</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Fault Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="Describe the issue in detail — include location, symptoms, impact on operations..."
              className="input resize-none"
              required
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="label">Vendor</label>
            <select
              value={form.vendorId}
              onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}
              className="input"
            >
              <option value="">Select vendor (optional)</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} — {v.category}</option>
              ))}
            </select>
          </div>

          {form.vendorId && (
            <div>
              <label className="label">Vendor Type</label>
              <div className="flex gap-3">
                {(['recurring', 'one_time'] as VendorType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, vendorType: t }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      form.vendorType === t
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                    }`}
                  >
                    {t === 'recurring' ? 'Recurring' : 'One-Time'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Invoice Amount (₦)</label>
            <input
              type="number"
              value={form.invoiceAmount}
              onChange={e => setForm(f => ({ ...f, invoiceAmount: e.target.value }))}
              placeholder="0.00"
              className="input"
              min={0}
            />
          </div>

          {/* Budget Warning */}
          {budgetWarning && (
            <div className="alert-warning">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={15} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">Budget Warning</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  This invoice ({formatCurrency(invoiceAmt)}) will push budget to {Math.round(((site!.currentMonthSpend + invoiceAmt) / site!.monthlyBudget) * 100)}% utilization. {Math.round(((site!.currentMonthSpend + invoiceAmt) / site!.monthlyBudget) * 100) >= 90 ? 'Will be flagged for supervisor review.' : 'Supervisor will be notified.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Linked Asset */}
        <div className="card p-5">
          <label className="label">Linked Asset (optional)</label>
          <select
            value={form.assetId}
            onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
            className="input"
          >
            <option value="">No asset linked</option>
            {siteAssets.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Attachments placeholder */}
        <div className="card p-5">
          <label className="label">Attachments</label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-slate-600">Drop fault photo or invoice here</p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, PDF up to 10MB</p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!form.description || !form.vendorId}
            className="btn-primary flex-1"
          >
            <CheckCircle size={15} /> Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}
