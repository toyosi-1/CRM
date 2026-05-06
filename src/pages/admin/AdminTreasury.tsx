import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function AdminTreasury() {
  const { currentUser, treasury, addTreasuryEntry, requests } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', source: '', amount: '', type: 'inflow' as 'inflow' | 'outflow' });

  const totalInflow = treasury.filter(t => t.type === 'inflow').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = treasury.filter(t => t.type === 'outflow').reduce((s, t) => s + t.amount, 0);
  const operationalSpend = requests.filter(r => r.status === 'PAID').reduce((s, r) => s + (r.netPayment ?? r.invoiceAmount ?? 0), 0);
  const netBalance = totalInflow - totalOutflow;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addTreasuryEntry({
      description: form.description,
      source: form.source,
      amount: parseFloat(form.amount),
      type: form.type,
      date: new Date().toISOString(),
      recordedBy: currentUser?.name ?? 'Admin',
    });
    setForm({ description: '', source: '', amount: '', type: 'inflow' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Treasury Ledger</h1>
          <p className="page-subtitle">Non-operational revenue and facility financial overview</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <span className="trend-up">Inflow</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 animate-count-up">{formatCurrency(totalInflow)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Non-Op Inflow</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Non-Op Outflow</span>
            <TrendingDown size={14} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflow)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Treasury</span>
          </div>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(netBalance)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operational Spend</span>
            <TrendingDown size={14} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(operationalSpend)}</p>
          <p className="text-xs text-slate-400 mt-1">Vendor payments</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card p-5">
          <h2 className="section-title mb-4">New Treasury Entry</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Description *</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="Revenue description" required />
            </div>
            <div>
              <label className="label">Source *</label>
              <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="input" placeholder="Company or source" required />
            </div>
            <div>
              <label className="label">Amount (₦) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input" placeholder="0.00" required min={1} />
            </div>
            <div>
              <label className="label">Type</label>
              <div className="flex gap-3">
                {(['inflow', 'outflow'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${form.type === t ? (t === 'inflow' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-slate-600 border-slate-300'}`}>
                    {t === 'inflow' ? '↑ Inflow' : '↓ Outflow'}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Add to Ledger</button>
            </div>
          </form>
        </div>
      )}

      {/* Ledger */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="section-title">Treasury Entries</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header">Date</th>
              <th className="table-header">Description</th>
              <th className="table-header">Source</th>
              <th className="table-header">Type</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {treasury.map(entry => (
              <tr key={entry.id} className="table-row">
                <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{formatDate(entry.date)}</td>
                <td className="table-cell text-sm font-medium text-slate-700">{entry.description}</td>
                <td className="table-cell text-sm text-slate-500">{entry.source}</td>
                <td className="table-cell">
                  <span className={`badge ${entry.type === 'inflow' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.type === 'inflow' ? '↑ Inflow' : '↓ Outflow'}
                  </span>
                </td>
                <td className={`table-cell font-bold ${entry.type === 'inflow' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {entry.type === 'outflow' ? '-' : '+'}{formatCurrency(entry.amount)}
                </td>
                <td className="table-cell text-xs text-slate-400">{entry.recordedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
