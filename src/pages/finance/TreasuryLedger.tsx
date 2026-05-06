import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function TreasuryLedger() {
  const { currentUser, treasury, addTreasuryEntry } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', source: '', amount: '', type: 'inflow' as 'inflow' | 'outflow' });

  const totalInflow = treasury.filter(t => t.type === 'inflow').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = treasury.filter(t => t.type === 'outflow').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalInflow - totalOutflow;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addTreasuryEntry({
      description: form.description,
      source: form.source,
      amount: parseFloat(form.amount),
      type: form.type,
      date: new Date().toISOString(),
      recordedBy: currentUser?.name ?? 'Unknown',
    });
    setForm({ description: '', source: '', amount: '', type: 'inflow' });
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Treasury Ledger</h1>
          <p className="page-subtitle">Non-operational revenue and facility inflows · Net balance: <span className={netBalance >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{formatCurrency(Math.abs(netBalance))}</span></p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <span className="trend-up">Inflows</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 animate-count-up">{formatCurrency(totalInflow)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Inflows</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-500" />
            </div>
            <span className="trend-down">Outflows</span>
          </div>
          <p className="text-2xl font-extrabold text-red-600 animate-count-up">{formatCurrency(totalOutflow)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Outflows</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-brand-600" />
            </div>
            <span className={netBalance >= 0 ? 'trend-up' : 'trend-down'}>{netBalance >= 0 ? 'Surplus' : 'Deficit'}</span>
          </div>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <div className="card p-5">
          <h2 className="section-title mb-4">New Treasury Entry</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Description *</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="Entry description" required />
            </div>
            <div>
              <label className="label">Source / Counterparty *</label>
              <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="input" placeholder="Company or source name" required />
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

      {/* Ledger Table */}
      <div className="card overflow-hidden">
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
                <td className="table-cell text-xs text-slate-500">{formatDate(entry.date)}</td>
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
