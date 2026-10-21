import { useState, type FormEvent } from 'react';
import { Banknote, Loader2, Plus, Wallet, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function FinancePettyCash() {
  const { currentUser, sites, pettyCash, createPettyCashEntry } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const enabledSites = sites.filter(site => site.pettyCashEnabled);
  const selectedSite = sites.find(site => site.id === siteId);
  const balanceFor = (id: string) => pettyCash
    .filter(entry => entry.siteId === id && entry.status === 'approved')
    .reduce((sum, entry) => sum + (entry.type === 'top_up' ? entry.amount : -entry.amount), 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !selectedSite) return;
    const topUpAmount = Number(amount);
    if (topUpAmount <= 0) {
      setError('Enter a top-up amount greater than zero.');
      return;
    }
    const nextBalance = balanceFor(selectedSite.id) + topUpAmount;
    if (selectedSite.floatLimit > 0 && nextBalance > selectedSite.floatLimit) {
      setError(`This top-up would bring ${selectedSite.name} to ${formatCurrency(nextBalance)}, above its ${formatCurrency(selectedSite.floatLimit)} limit.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createPettyCashEntry({
        siteId: selectedSite.id,
        type: 'top_up',
        amount: topUpAmount,
        description,
        recordedBy: currentUser.id,
      });
      setSiteId('');
      setAmount('');
      setDescription('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Petty cash</h1>
          <p className="page-subtitle">Load approved site floats and monitor petty cash balances.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} />Load petty cash</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Load facility petty cash</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close"><XCircle size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group"><label className="label">Facility</label><select className="select" value={siteId} onChange={e => setSiteId(e.target.value)} required><option value="">Select facility</option>{enabledSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div>
            <div className="form-group"><label className="label">Amount</label><input className="input" type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} required /></div>
            <div className="form-group"><label className="label">Description</label><input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Cash issued to facility" required /></div>
          </div>
          {selectedSite && <p className="text-xs text-slate-500">Current balance {formatCurrency(balanceFor(selectedSite.id))} · Limit {formatCurrency(selectedSite.floatLimit)}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button className="btn-primary" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Load cash</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enabledSites.map(site => {
          const balance = balanceFor(site.id);
          const pct = site.floatLimit > 0 ? Math.round((balance / site.floatLimit) * 100) : 0;
          return (
            <div key={site.id} className="stat-card">
              <div className="flex items-start justify-between mb-3"><div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center"><Wallet size={16} className="text-brand-600" /></div><span className={`badge ${pct >= 90 ? 'bg-red-100 text-red-700' : pct >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{pct}%</span></div>
              <p className="text-sm font-bold text-slate-900">{site.name}</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatCurrency(balance)}</p>
              <p className="text-xs text-slate-400 mt-1">Float limit {formatCurrency(site.floatLimit)}</p>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2"><Banknote size={18} className="text-brand-600" /><h2 className="section-title">Petty cash ledger</h2></div>
        {pettyCash.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No petty cash has been loaded or spent yet.</div>
        ) : (
          <div className="table-scroll"><table><thead><tr><th>Date</th><th>Facility</th><th>Description</th><th>Type</th><th className="text-right">Amount</th></tr></thead><tbody>{pettyCash.map(entry => <tr key={entry.id}><td>{formatDate(entry.createdAt)}</td><td>{sites.find(site => site.id === entry.siteId)?.name ?? entry.siteId}</td><td>{entry.description}</td><td>{entry.type === 'top_up' ? 'Top-up' : 'Expense'}</td><td className={`text-right font-bold ${entry.type === 'top_up' ? 'text-emerald-600' : 'text-red-600'}`}>{entry.type === 'top_up' ? '+' : '-'}{formatCurrency(entry.amount)}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
