import { useState, type FormEvent } from 'react';
import { CheckCircle, Flag, PlusCircle, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate, formatCurrency } from '../../utils/helpers';

export default function Reconciliation() {
  const { currentUser, requests, sites, reconciliationEntries, setRequestRecon, updateReconEntry, createReconEntry } = useStore();
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [error, setError] = useState('');
  const [closeMsg, setCloseMsg] = useState('');

  // Executed payments awaiting reconciliation
  const paid = requests.filter(r => r.status === 'PAID' || r.status === 'CLOSED');
  const unconfirmed = paid.filter(r => r.reconStatus !== 'confirmed');
  const openExceptions = reconciliationEntries.filter(e => e.state === 'exception' || e.state === 'pending');

  const confirm = (id: string) => {
    if (!currentUser) return;
    setRequestRecon(id, 'confirmed', '', currentUser.id);
  };

  const flag = (id: string) => {
    if (!currentUser || !flagReason.trim()) { setError('Flagging demands a written reason.'); return; }
    setRequestRecon(id, 'flagged', flagReason.trim(), currentUser.id);
    setFlagging(null); setFlagReason(''); setError('');
  };

  const closePeriod = () => {
    if (unconfirmed.length > 0 || openExceptions.length > 0) {
      setCloseMsg(`Close period refused — ${unconfirmed.length} payment${unconfirmed.length === 1 ? '' : 's'} unconfirmed, ${openExceptions.length} open exception${openExceptions.length === 1 ? '' : 's'}.`);
    } else {
      setCloseMsg('Period closed — every executed payment is confirmed.');
    }
  };

  const logDebit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const form = e.currentTarget.elements as unknown as Record<string, HTMLInputElement | HTMLSelectElement>;
    await createReconEntry({
      entryDate: form.date.value, reference: form.ref.value, payee: form.payee.value,
      siteId: form.site.value || undefined, amount: Number(form.amount.value),
      state: 'exception', note: form.note.value, recordedBy: currentUser.id,
    });
    e.currentTarget.reset();
  };

  const stateBadge = (state: string) =>
    state === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : state === 'exception' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Finance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Reconciliation</h1>
          <p className="text-white/60 text-sm mt-1">Confirm executed payments against the bank record. No bank API — all confirmations are manual.</p>
        </div>
        <button className="btn-white-glass" onClick={closePeriod}><Lock size={14} />Close period</button>
      </div>

      {closeMsg && (
        <div className={unconfirmed.length > 0 || openExceptions.length > 0 ? 'alert-warning' : 'alert-info'}>
          <span className="text-sm">{closeMsg}</span>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-900">Executed payments</h2>
          <span className="badge bg-amber-100 text-amber-700">{unconfirmed.length} unconfirmed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th scope="col" className="px-4 py-3 font-semibold">Request</th>
                <th scope="col" className="px-4 py-3 font-semibold">Payee</th>
                <th scope="col" className="px-4 py-3 font-semibold">Site</th>
                <th scope="col" className="px-4 py-3 font-semibold">Net paid</th>
                <th scope="col" className="px-4 py-3 font-semibold">State</th>
                <th scope="col" className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paid.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3"><p className="font-mono text-xs font-bold">{r.requestNumber}</p><p className="text-xs text-slate-500">{r.description.slice(0, 50)}</p></td>
                  <td className="px-4 py-3 text-slate-600">{r.vendorName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.siteName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.netPayment != null ? formatCurrency(r.netPayment) : formatCurrency(r.grossAmount ?? r.invoiceAmount ?? 0)}</td>
                  <td className="px-4 py-3">
                    {r.reconStatus === 'confirmed' && <span className="badge bg-emerald-100 text-emerald-700">Confirmed</span>}
                    {r.reconStatus === 'flagged' && <span className="badge bg-red-100 text-red-700" title={r.reconNote}>Flagged</span>}
                    {!r.reconStatus && <span className="badge bg-amber-100 text-amber-700">Pending</span>}
                    {r.reconNote && <p className="text-[10px] text-slate-400 mt-1">{r.reconNote}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {r.reconStatus !== 'confirmed' && flagging !== r.id && (
                      <div className="flex gap-1.5">
                        <button className="btn-secondary text-xs" onClick={() => confirm(r.id)}><CheckCircle size={11} />Confirm</button>
                        <button className="btn-secondary text-xs" onClick={() => setFlagging(r.id)}><Flag size={11} />Flag</button>
                      </div>
                    )}
                    {flagging === r.id && (
                      <div className="space-y-1.5">
                        {error && <p className="text-[10px] text-red-600 font-semibold">{error}</p>}
                        <input className="input !py-1 text-xs" placeholder="Reason (required)" value={flagReason} onChange={e => setFlagReason(e.target.value)} />
                        <div className="flex gap-1.5">
                          <button className="btn-primary text-xs" onClick={() => flag(r.id)}>Save flag</button>
                          <button className="btn-secondary text-xs" onClick={() => { setFlagging(null); setError(''); }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {paid.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">No executed payments yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form onSubmit={logDebit} className="card p-5 space-y-3">
          <h2 className="font-black text-slate-900 flex items-center gap-2"><PlusCircle size={16} className="text-brand-600" />Log unlinked debit</h2>
          <p className="text-xs text-slate-500">A debit that left the account with no originating work order — files as an exception.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group"><label className="label">Date</label><input name="date" type="date" className="input" required /></div>
            <div className="form-group"><label className="label">Reference</label><input name="ref" className="input" required /></div>
            <div className="form-group"><label className="label">Payee</label><input name="payee" className="input" required /></div>
            <div className="form-group"><label className="label">Amount (₦)</label><input name="amount" type="number" min={1} className="input" required /></div>
          </div>
          <div className="form-group"><label className="label">Facility</label><select name="site" className="select"><option value="">Unallocated</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="form-group"><label className="label">Note</label><input name="note" className="input" placeholder="Context for the exception" /></div>
          <button className="btn-primary w-full">Log exception</button>
        </form>

        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100"><h2 className="font-black text-slate-900">Reconciliation entries</h2></div>
          <div className="divide-y divide-slate-100">
            {reconciliationEntries.map(e => (
              <div key={e.id} className="p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{e.payee} <span className="font-mono text-xs text-slate-400">· {e.reference}</span></p>
                  <p className="text-xs text-slate-500">{formatDate(e.entryDate)} · {formatCurrency(e.amount)}{e.note ? ` · ${e.note}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${stateBadge(e.state)}`}>{e.state}</span>
                  {e.state !== 'confirmed' && (
                    <button className="btn-secondary text-xs" onClick={() => updateReconEntry(e.id, { state: 'confirmed' })}>Confirm</button>
                  )}
                </div>
              </div>
            ))}
            {reconciliationEntries.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No entries logged</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
