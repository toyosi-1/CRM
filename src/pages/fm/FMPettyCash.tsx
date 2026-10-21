import { useState, type FormEvent } from 'react';
import { Banknote, Loader2, Pencil, Plus, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';
import type { PettyCashEntry } from '../../types';

export default function FMPettyCash() {
  const { currentUser, sites, pettyCash, createPettyCashEntry, updatePettyCashEntry, activeSiteId } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const site = sites.find(s => s.id === siteId);
  const siteEntries = pettyCash.filter(e => e.siteId === siteId);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState('');

  const balance = siteEntries.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.type === 'top_up' ? e.amount : -e.amount), 0);
  const totalLoaded = siteEntries.filter(e => e.type === 'top_up' && e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const totalSpent = siteEntries.filter(e => e.type === 'expense' && e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !siteId) return;
    const expenseAmount = Number(amount);
    if (expenseAmount <= 0) {
      setError('Enter an expense amount greater than zero.');
      return;
    }
    if (expenseAmount > balance) {
      setError(`This expense exceeds the available balance of ${formatCurrency(balance)}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createPettyCashEntry({ siteId, type: 'expense', amount: expenseAmount, description, recordedBy: currentUser.id });
      setAmount('');
      setDescription('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry: PettyCashEntry) => {
    setEditingId(entry.id);
    setEditAmount(String(entry.amount));
    setEditDescription(entry.description);
    setEditReason('');
    setEditError('');
  };

  const saveEdit = async (entry: PettyCashEntry) => {
    if (!currentUser) return;
    const amount = Number(editAmount);
    if (!editDescription.trim() || amount <= 0) { setEditError('Enter a description and an amount greater than zero.'); return; }
    const needsReason = (entry.editCount ?? 0) > 0;
    if (needsReason && !editReason.trim()) { setEditError('A comment is required — this entry has already been edited. Explain why it is being changed again.'); return; }
    setSaving(true);
    setEditError('');
    try {
      const notes = [...(entry.editNotes ?? [])];
      if (editReason.trim()) notes.push({ note: editReason.trim(), by: currentUser.id, at: new Date().toISOString() });
      await updatePettyCashEntry(entry.id, {
        amount, description: editDescription.trim(),
        editCount: (entry.editCount ?? 0) + 1, editNotes: notes,
      });
      setEditingId(null);
    } catch {
      setEditError('Unable to update the entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Petty cash</h1>
          <p className="page-subtitle">Record site expenses and track the remaining float.</p>
        </div>
        <div className="stat-card min-w-44">
          <p className="text-xs text-slate-500">Available balance</p>
          <p className="text-2xl font-extrabold text-slate-900">{formatCurrency(balance)}</p>
          <p className="text-[11px] text-slate-400">Float limit {formatCurrency(site?.floatLimit ?? 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-slate-500">Loaded by finance</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(totalLoaded)}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500">Spent by site</p><p className="text-xl font-bold text-red-600">{formatCurrency(totalSpent)}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500">Remaining</p><p className="text-xl font-bold text-slate-900">{formatCurrency(balance)}</p></div>
      </div>

      {site?.pettyCashEnabled ? (
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} />Record expense</button>
      ) : (
        <div className="alert-warning">Petty cash is not enabled for this site. Contact an administrator or supervisor.</div>
      )}

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">New petty cash expense</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close"><XCircle size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group"><label className="label">Amount</label><input className="input" type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} required /></div>
            <div className="form-group"><label className="label">Description</label><input className="input" value={description} onChange={e => setDescription(e.target.value)} required /></div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button className="btn-primary" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Record expense</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2"><Banknote size={18} className="text-brand-600" /><h2 className="section-title">Entries</h2></div>
        {siteEntries.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No petty cash entries recorded for this facility.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {siteEntries.map(entry => {
              const canEdit = entry.type === 'expense' && (entry.recordedBy === currentUser?.id || currentUser?.role === 'admin');
              const lastNote = entry.editNotes?.[entry.editNotes.length - 1];
              return (
              <div key={entry.id} className="p-4">
                {editingId === entry.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="form-group"><label className="label">Amount</label><input className="input" type="number" min={1} value={editAmount} onChange={e => setEditAmount(e.target.value)} /></div>
                      <div className="form-group"><label className="label">Description</label><input className="input" value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
                    </div>
                    <div className="form-group">
                      <label className="label">Reason for edit{(entry.editCount ?? 0) > 0 ? ' *' : ' (optional)'}</label>
                      <input className="input" value={editReason} onChange={e => setEditReason(e.target.value)} placeholder={(entry.editCount ?? 0) > 0 ? 'Required — this entry was edited before' : 'Why is this entry being corrected?'} />
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex gap-2 justify-end">
                      <button className="btn-ghost text-xs" onClick={() => setEditingId(null)}><XCircle size={13} /> Cancel</button>
                      <button className="btn-primary text-xs px-4" disabled={saving} onClick={() => void saveEdit(entry)}>{saving && <Loader2 size={13} className="animate-spin" />}Save changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800">{entry.description}</p>
                      <p className="text-xs text-slate-500">{formatDate(entry.createdAt)} · {entry.type === 'top_up' ? 'Finance top-up' : 'Site expense'}{(entry.editCount ?? 0) > 0 && <span className="text-amber-600 font-semibold"> · edited {entry.editCount}×</span>}</p>
                      {lastNote && <p className="text-xs text-amber-600 mt-0.5">Last edit note: {lastNote.note}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className={`text-sm font-black ${entry.type === 'top_up' ? 'text-emerald-600' : 'text-red-600'}`}>{entry.type === 'top_up' ? '+' : '-'}{formatCurrency(entry.amount)}</p>
                      {canEdit && <button className="btn-ghost text-xs text-slate-500" onClick={() => startEdit(entry)}><Pencil size={12} /> Edit</button>}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
