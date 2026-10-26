import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Users, Package, TrendingUp, TrendingDown, Landmark, BookMarked, BarChart3, Activity, Plus, Loader2, Trash2, Upload, Paperclip } from 'lucide-react';
import FinImport from './FinImport';
import { useStore } from '../../store/useStore';
import {
  createFinContact, upsertFinItem, deleteFinItem, createFinDocument, updateFinDocument,
  voidFinDocument, postJournal, logFinActivity, upsertFinBudget, upsertFinAccount, uploadFile, type PostLine,
} from '../../lib/db';
import { reportSaveError } from '../../store/useStore';
import type { FinAccount, FinDocument, FinDocKind } from '../../types';

const fmt = (v: number) => `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const r2 = (v: number) => Math.round(v * 100) / 100;

type Tab = 'home' | 'contacts' | 'items' | 'projects' | 'sales' | 'purchases' | 'banking' | 'journals' | 'reports' | 'activity' | 'import';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Landmark size={14} /> },
  { id: 'contacts', label: 'Contacts', icon: <Users size={14} /> },
  { id: 'items', label: 'Items', icon: <Package size={14} /> },
  { id: 'projects', label: 'Projects', icon: <BookOpen size={14} /> },
  { id: 'sales', label: 'Sales', icon: <TrendingUp size={14} /> },
  { id: 'purchases', label: 'Purchases', icon: <TrendingDown size={14} /> },
  { id: 'banking', label: 'Banking', icon: <Landmark size={14} /> },
  { id: 'journals', label: 'Journals', icon: <BookMarked size={14} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={14} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
  { id: 'import', label: 'Import', icon: <Upload size={14} /> },
];

const KIND_LABEL: Record<string, string> = { invoice: 'Invoice', receipt: 'Receipt', bill: 'Bill', payment: 'Payment', expense: 'Expense', bank: 'Bank txn', journal: 'Journal' };
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500', issued: 'bg-blue-100 text-blue-700', part_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700', void: 'bg-red-100 text-red-600', published: 'bg-emerald-100 text-emerald-700',
};

export default function FinanceLedger() {
  const { finAccounts, finJournalEntries, finJournalLines, finContacts, finItems, finDocuments, finBudgets, finActivity, currentUser, getBudgetSummaries } = useStore();
  const nav = useNavigate();
  const seg = useParams()['*'] ?? '';
  const [pTab, pSub] = seg.split('/');
  const tab = (TABS.some(t => t.id === pTab) ? pTab : 'home') as Tab;
  const setTab = (t: Tab) => void nav(`/finance/ledger${t === 'home' ? '' : '/' + t}`);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<'tb' | 'pl' | 'bs' | 'acct' | 'budget'>('tb');
  const [acctId, setAcctId] = useState('');
  const [budId, setBudId] = useState('');
  const [budName, setBudName] = useState('');
  const [budPeriod, setBudPeriod] = useState(String(new Date().getFullYear()));
  const [budLines, setBudLines] = useState<{ accountId: string; amount: string }[]>([{ accountId: '', amount: '' }]);
  const me = currentUser?.name ?? 'Finance';

  useEffect(() => {
    if (tab === 'reports' && pSub && ['tb', 'pl', 'bs', 'acct', 'budget'].includes(pSub)) setReport(pSub as typeof report);
  }, [tab, pSub]);

  const byCode = useMemo(() => Object.fromEntries(finAccounts.map(a => [a.code, a])), [finAccounts]);
  const acct = (code: string) => byCode[code]?.id;
  const accName = (id?: string) => finAccounts.find(a => a.id === id)?.name ?? '—';
  const contactName = (id?: string) => finContacts.find(c => c.id === id)?.name ?? '—';

  // Account balances from published journal lines: asset/expense → dr-cr; liabilities/income → cr-dr
  const balances = useMemo(() => {
    const net = new Map<string, number>();
    finJournalEntries.filter(e => e.status === 'published').forEach(e => {
      finJournalLines.filter(l => l.entryId === e.id).forEach(l => {
        net.set(l.accountId, (net.get(l.accountId) ?? 0) + l.debit - l.credit);
      });
    });
    return net;
  }, [finJournalEntries, finJournalLines]);
  const bal = (id: string) => balances.get(id) ?? 0;
  const natural = (a: FinAccount) => ['Cash', 'Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Cost of Goods Sold', 'Expense', 'Other Expense'].includes(a.type) ? bal(a.id) : -bal(a.id);

  const pl = useMemo(() => {
    const nat = (a: FinAccount) => ['Cash', 'Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Cost of Goods Sold', 'Expense', 'Other Expense'].includes(a.type) ? (balances.get(a.id) ?? 0) : -(balances.get(a.id) ?? 0);
    const inc = finAccounts.filter(a => ['Income', 'Other Income'].includes(a.type)).reduce((s, a) => s + nat(a), 0);
    const exp = finAccounts.filter(a => ['Cost of Goods Sold', 'Expense', 'Other Expense'].includes(a.type)).reduce((s, a) => s + nat(a), 0);
    return { inc, exp, net: inc - exp };
  }, [finAccounts, balances]);

  const post = async (doc: Omit<FinDocument, 'id' | 'createdAt'>, lines: PostLine[]) => {
    setBusy(true);
    try {
      await createFinDocument(doc, lines);
      await logFinActivity(me, `Posted ${doc.no} (${KIND_LABEL[doc.kind] ?? doc.kind}) ${fmt(doc.total)}`, doc.no);
    } catch (e) { reportSaveError(e); } finally { setBusy(false); }
  };

  const voidDoc = async (d: FinDocument) => {
    if (!confirm(`Void ${d.no}? The ledger entry is reversed.`)) return;
    try { await voidFinDocument(d.id, d.no, me); } catch (e) { reportSaveError(e); }
  };

  const nextNo = (prefix: string, kind: string) => {
    const nums = finDocuments.filter(d => d.kind === kind).map(d => parseInt(d.no.replace(/\D/g, ''), 10)).filter(Number.isFinite);
    return `${prefix}-${String((Math.max(0, ...nums) + 1)).padStart(4, '0')}`;
  };

  /* ---------- document form (modal-ish inline panel) ---------- */
  const [form, setForm] = useState<null | { kind: FinDocKind }>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<{ accountId: string; amount: string; memo: string; dr?: string; cr?: string }[]>([{ accountId: '', amount: '', memo: '' }]);
  const openForm = (kind: FinDocKind) => { setForm({ kind }); setF({ date: today(), bankAccountId: 'acc_1100', cashAccountId: 'acc_1000' }); setLines([{ accountId: '', amount: '', memo: '' }]); };

  const submitDoc = async () => {
    if (!form) return;
    const k = form.kind;
    const lns = lines.filter(l => l.accountId && Number(l.amount) > 0);
    const total = r2(lns.reduce((s, l) => s + Number(l.amount), 0));
    if (k !== 'bank' && lns.length === 0) return alert('Add at least one line with an account and amount.');
    const base: Omit<FinDocument, 'id' | 'createdAt'> = { kind: k, no: f.no || nextNo(k.slice(0, 3).toUpperCase(), k), date: f.date || today(), status: 'issued', contactId: f.contactId || undefined, total, paid: 0, createdBy: me, payload: { lines: lns, memo: f.memo, bankAccountId: f.bankAccountId, linkedDocId: f.linkedDocId } };

    let jl: PostLine[] = [];
    const status: FinDocument['status'] = 'issued';
    if (k === 'invoice') {
      const vat = Number(f.vat || 0); const t = r2(total + vat);
      jl = [{ accountId: acct('1200')!, dr: t, memo: 'AR' }, ...lns.map(l => ({ accountId: l.accountId, cr: Number(l.amount), memo: l.memo }))];
      if (vat > 0) jl.push({ accountId: acct('2100')!, cr: vat, memo: 'VAT output' });
      await post({ ...base, total: t, status }, jl);
    } else if (k === 'receipt') {
      jl = [{ accountId: f.bankAccountId || acct('1100')!, dr: total }, ...lns.map(l => ({ accountId: l.accountId, cr: Number(l.amount), memo: l.memo }))];
      await post({ ...base, status: 'paid' }, jl);
    } else if (k === 'bill') {
      jl = [...lns.map(l => ({ accountId: l.accountId, dr: Number(l.amount), memo: l.memo })), { accountId: acct('2000')!, cr: total }];
      await post({ ...base, status }, jl);
    } else if (k === 'payment') {
      jl = [{ accountId: acct('2000')!, dr: total }, { accountId: f.bankAccountId || acct('1100')!, cr: total }];
      const linked = finDocuments.find(d => d.id === f.linkedDocId);
      if (linked) {
        const paid = r2(linked.paid + total);
        await updateFinDocument(linked.id, { paid, status: paid >= linked.total - 0.005 ? 'paid' : 'part_paid' }).catch(reportSaveError);
      }
      await post({ ...base, status: 'paid' }, jl);
    } else if (k === 'expense') {
      jl = [...lns.map(l => ({ accountId: l.accountId, dr: Number(l.amount), memo: l.memo })), { accountId: f.cashAccountId || acct('1000')!, cr: total }];
      await post({ ...base, status: 'paid' }, jl);
    } else if (k === 'bank') {
      const amt = Number(f.amount || 0);
      if (amt <= 0 || !lns[0]?.accountId) return alert('Enter an amount and pick the offsetting account.');
      const deposit = f.direction === 'in';
      jl = deposit
        ? [{ accountId: f.bankAccountId, dr: amt }, { accountId: lns[0].accountId, cr: amt, memo: lns[0].memo }]
        : [{ accountId: lns[0].accountId, dr: amt, memo: lns[0].memo }, { accountId: f.bankAccountId, cr: amt }];
      await post({ ...base, total: amt, status: 'paid' }, jl);
    }
    setForm(null);
  };

  const openDocs = (kinds: FinDocKind[]) => finDocuments.filter(d => kinds.includes(d.kind));

  const attach = async (d: FinDocument, file: File) => {
    setBusy(true);
    try {
      const url = await uploadFile(`fin-docs/${d.id}/${crypto.randomUUID()}-${file.name}`, file);
      const atts = [...((d.payload.attachments as { name: string; url: string }[] | undefined) ?? []), { name: file.name, url }];
      await updateFinDocument(d.id, { payload: { ...d.payload, attachments: atts } });
      await logFinActivity(me, `Attached ${file.name} to ${d.no}`, d.no).catch(() => undefined);
    } catch (e) { reportSaveError(e); } finally { setBusy(false); }
  };

  const docRow = (d: FinDocument) => (
    <div key={d.id} className="px-4 py-3">
    <div className="flex items-center gap-3 text-sm">
      <span className="font-mono text-xs font-bold text-slate-500 w-20 flex-shrink-0">{d.no}</span>
      <span className="text-xs text-slate-400 w-20 flex-shrink-0">{d.date}</span>
      <span className="flex-1 font-semibold text-slate-700 truncate">{d.contactId ? contactName(d.contactId) : String(d.payload.memo ?? KIND_LABEL[d.kind])}</span>
      <span className="font-bold text-slate-900 tabular-nums">{fmt(d.total)}</span>
      {d.paid > 0 && d.total > 0 && d.status !== 'paid' && <span className="text-[11px] text-slate-400 tabular-nums">{fmt(d.paid)} paid</span>}
      <span className={`badge ${STATUS_COLORS[d.status] ?? 'bg-slate-100 text-slate-500'}`}>{d.status.replace('_', ' ')}</span>
      {['issued', 'part_paid'].includes(d.status) && ['invoice', 'bill'].includes(d.kind) && (
        <button onClick={() => { const k = d.kind === 'invoice' ? 'receipt' : 'payment'; openForm(k); setF(v => ({ ...v, linkedDocId: d.id, contactId: d.contactId ?? '' })); setLines([{ accountId: acct(d.kind === 'invoice' ? '1200' : '2000')!, amount: String(r2(d.total - d.paid)), memo: `${KIND_LABEL[d.kind]} ${d.no}` }]); }} className="text-[11px] font-bold text-brand-600 whitespace-nowrap">{d.kind === 'invoice' ? 'Record receipt' : 'Record payment'}</button>
      )}
      {d.status !== 'void' && (
        <label className="text-slate-400 hover:text-brand-600 cursor-pointer" title="Attach a file">
          <Paperclip size={13} />
          <input type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void attach(d, file); e.target.value = ''; }} />
        </label>
      )}
      {d.status !== 'void' && <button onClick={() => void voidDoc(d)} className="text-[11px] text-red-500 font-semibold">Void</button>}
    </div>
    {((d.payload.attachments as { name: string; url: string }[] | undefined)?.length ?? 0) > 0 && (
      <div className="flex gap-1.5 flex-wrap mt-1.5 pl-28">
        {(d.payload.attachments as { name: string; url: string }[]).map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-brand-700 bg-slate-100 rounded-full px-2 py-0.5 hover:bg-slate-200"><Paperclip size={9} />{a.name}</a>
        ))}
      </div>
    )}
    </div>
  );

  const accountPicker = (value: string, onChange: (v: string) => void, types?: string[]) => (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Choose account…</option>
      {finAccounts.filter(a => !types || types.includes(a.type)).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
    </select>
  );

  return (
    <div className="space-y-5">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Finance</p>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><BookOpen size={20} />Ledger</h1>
          <p className="text-white/60 text-sm mt-1">Double-entry books — every document posts a balanced journal.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* ---------- HOME ---------- */}
      {tab === 'home' && (
        <div className="space-y-5">
          {/* Facility budget alerts — requests paid out of each site's monthly budget */}
          {(() => {
            const sums = getBudgetSummaries().filter(s => s.monthlyBudget > 0);
            const warns = sums.filter(s => s.utilizationPct >= 80);
            return (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-slate-900">Facility budgets — this month</h2>
                  {warns.length > 0 && <span className="badge bg-red-100 text-red-700">{warns.length} at/near limit</span>}
                </div>
                {warns.length > 0 && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">⚠ {warns.map(s => s.siteName).join(', ')} {warns.length === 1 ? 'has' : 'have'} used ≥80% of the monthly budget — review before approving further spend.</p>}
                {sums.length === 0 && <p className="text-sm text-slate-400">No facility budgets set — configure in Site management.</p>}
                {sums.map(s => (
                  <div key={s.siteId} className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="font-bold text-slate-800">{s.siteName}</span><span className={`text-xs font-bold ${s.utilizationPct >= 100 ? 'text-red-600' : s.utilizationPct >= 80 ? 'text-amber-600' : 'text-slate-500'}`}>{fmt(s.spent)} / {fmt(s.monthlyBudget)} · {Math.round(s.utilizationPct)}%</span></div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${s.utilizationPct >= 100 ? 'bg-red-500' : s.utilizationPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, s.utilizationPct)}%` }} /></div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Cash & bank</p><p className="text-xl font-black text-slate-900 mt-1">{fmt(finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).reduce((s, a) => s + bal(a.id), 0))}</p></div>
            <div className="card p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Receivable</p><p className="text-xl font-black text-slate-900 mt-1">{fmt(bal(acct('1200')!))}</p></div>
            <div className="card p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Payable</p><p className="text-xl font-black text-slate-900 mt-1">{fmt(-bal(acct('2000')!))}</p></div>
            <div className="card p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Net result</p><p className={`text-xl font-black mt-1 ${pl.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(pl.net)}</p></div>
          </div>
          <div className="card p-5">
            <h2 className="font-black text-slate-900 mb-3">Recent documents</h2>
            <div className="divide-y divide-slate-100">{openDocs(['invoice', 'receipt', 'bill', 'payment', 'expense', 'bank', 'journal']).slice(0, 12).map(docRow)}</div>
          </div>
        </div>
      )}

      {/* ---------- CONTACTS ---------- */}
      {tab === 'contacts' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">Contacts</h2></div>
          <form onSubmit={async e => { e.preventDefault(); const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>; setBusy(true); try { await createFinContact({ name: el.cName.value, type: el.cType.value as 'customer' | 'vendor' | 'both', email: el.cEmail.value, phone: el.cPhone.value }); e.currentTarget.reset(); } catch (err) { reportSaveError(err); } finally { setBusy(false); } }} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl">
            <input name="cName" className="input" placeholder="Name" required />
            <select name="cType" className="select"><option value="customer">Customer</option><option value="vendor">Vendor</option><option value="both">Both</option></select>
            <input name="cEmail" className="input" type="email" placeholder="Email" />
            <input name="cPhone" className="input" placeholder="Phone" />
            <button className="btn-primary" disabled={busy}><Plus size={13} />Add</button>
          </form>
          <div className="divide-y divide-slate-100">
            {finContacts.map(c => (
              <div key={c.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="font-bold text-slate-800 flex-1">{c.name}</span>
                <span className="badge bg-slate-100 text-slate-600">{c.type}</span>
                <span className="text-xs text-slate-400">{c.email ?? ''} {c.phone ? `· ${c.phone}` : ''}</span>
              </div>
            ))}
            {finContacts.length === 0 && <p className="text-sm text-slate-400 py-4">No contacts yet.</p>}
          </div>
        </div>
      )}

      {/* ---------- ITEMS ---------- */}
      {tab === 'items' && (
        <div className="card p-5 space-y-4">
          <h2 className="font-black text-slate-900">Items & services</h2>
          <form onSubmit={async e => { e.preventDefault(); const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>; setBusy(true); try { await upsertFinItem({ name: el.iName.value, description: el.iDesc.value, price: Number(el.iPrice.value) || 0, accountId: el.iAcc.value || undefined }); e.currentTarget.reset(); } catch (err) { reportSaveError(err); } finally { setBusy(false); } }} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl">
            <input name="iName" className="input" placeholder="Item / service" required />
            <input name="iDesc" className="input" placeholder="Description" />
            <input name="iPrice" className="input" type="number" min={0} step="0.01" placeholder="Default price (₦)" />
            <div>{accountPicker('', v => { (document.querySelector('[name=iAcc]') as HTMLInputElement).value = v; })}<input type="hidden" name="iAcc" /></div>
            <button className="btn-primary" disabled={busy}><Plus size={13} />Add</button>
          </form>
          <div className="divide-y divide-slate-100">
            {finItems.map(i => (
              <div key={i.id} className="py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1"><p className="font-bold text-slate-800">{i.name}</p>{i.description && <p className="text-xs text-slate-400">{i.description}</p>}</div>
                <span className="text-xs text-slate-400">{accName(i.accountId)}</span>
                <span className="font-bold tabular-nums">{fmt(i.price)}</span>
                <button onClick={() => { if (confirm(`Delete ${i.name}?`)) void deleteFinItem(i.id).catch(reportSaveError); }} className="text-red-400"><Trash2 size={13} /></button>
              </div>
            ))}
            {finItems.length === 0 && <p className="text-sm text-slate-400 py-4">No items yet.</p>}
          </div>
        </div>
      )}

      {/* ---------- PROJECTS + TIMESHEETS ---------- */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <form onSubmit={async e => { e.preventDefault(); const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>; setBusy(true); try { await createFinDocument({ kind: 'project', no: `PRJ-${String(finDocuments.filter(d => d.kind === 'project').length + 1).padStart(3, '0')}`, date: today(), status: 'issued', total: 0, paid: 0, createdBy: me, payload: { name: el.pName.value, rate: Number(el.pRate.value) || 0, contactId: el.pContact.value || undefined } }); e.currentTarget.reset(); } catch (err) { reportSaveError(err); } finally { setBusy(false); } }} className="grid grid-cols-2 md:grid-cols-4 gap-2 card p-4">
            <input name="pName" className="input" placeholder="Project name" required />
            <input name="pRate" className="input" type="number" min={0} step="0.01" placeholder="Hourly rate (₦)" required />
            <select name="pContact" className="select"><option value="">Client (optional)</option>{finContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button className="btn-primary" disabled={busy}><Plus size={13} />New project</button>
          </form>

          {finDocuments.filter(d => d.kind === 'project').map(p => {
            const entries = finDocuments.filter(t => t.kind === 'timesheet' && t.projectId === p.id && t.status !== 'void');
            const unbilled = entries.filter(t => t.status !== 'paid');
            const unbilledHrs = unbilled.reduce((s, t) => s + Number(t.payload.hours ?? 0), 0);
            const rate = Number(p.payload.rate ?? 0);
            return (
              <div key={p.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div><p className="font-bold text-slate-900">{String(p.payload.name ?? p.no)}</p><p className="text-xs text-slate-400">{fmt(rate)}/hr{contactName(p.payload.contactId as string | undefined) !== '—' ? ` · ${contactName(p.payload.contactId as string | undefined)}` : ''} · {entries.reduce((s, t) => s + Number(t.payload.hours ?? 0), 0)}h logged</p></div>
                  {unbilledHrs > 0 && (
                    <button onClick={async () => {
                      const amt = r2(unbilledHrs * rate);
                      if (!confirm(`Bill ${r2(unbilledHrs)}h → invoice for ${fmt(amt)}?`)) return;
                      const invNo = nextNo('INV', 'invoice');
                      await post({ kind: 'invoice', no: invNo, date: today(), status: 'issued', contactId: (p.payload.contactId as string | undefined), total: amt, paid: 0, createdBy: me, payload: { lines: [{ accountId: acct('4000'), amount: String(amt), memo: `${r2(unbilledHrs)}h × ${fmt(rate)} — ${String(p.payload.name)}` }], projectId: p.id } },
                        [{ accountId: acct('1200')!, dr: amt, memo: 'AR' }, { accountId: acct('4000')!, cr: amt, memo: `${r2(unbilledHrs)}h — ${String(p.payload.name)}` }]);
                      await Promise.all(unbilled.map(t => updateFinDocument(t.id, { status: 'paid' }).catch(reportSaveError)));
                    }} disabled={busy} className="btn-primary text-xs">Bill {r2(unbilledHrs)}h → {fmt(r2(unbilledHrs * rate))}</button>
                  )}
                </div>
                <form onSubmit={async e => { e.preventDefault(); const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>; try { await createFinDocument({ kind: 'timesheet', no: `TS-${finDocuments.filter(t => t.kind === 'timesheet').length + 1}`, date: el.tsDate.value || today(), status: 'issued', total: 0, paid: 0, projectId: p.id, createdBy: me, payload: { hours: Number(el.tsHours.value) || 0, memo: el.tsMemo.value } }); e.currentTarget.reset(); } catch (err) { reportSaveError(err); } }} className="flex gap-2 items-center">
                  <input name="tsDate" className="input w-36" type="date" defaultValue={today()} />
                  <input name="tsHours" className="input w-24" type="number" min={0.25} step={0.25} placeholder="Hours" required />
                  <input name="tsMemo" className="input flex-1" placeholder="What was done" />
                  <button className="btn-secondary text-xs whitespace-nowrap">Log time</button>
                </form>
                {entries.length > 0 && (
                  <div className="divide-y divide-slate-50 text-xs">
                    {entries.map(t => (
                      <div key={t.id} className="py-1.5 flex gap-3"><span className="text-slate-400 w-20 flex-shrink-0">{t.date}</span><span className="font-bold w-12">{String(t.payload.hours)}h</span><span className="flex-1 text-slate-500">{String(t.payload.memo ?? '')}</span><span className={`badge ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{t.status === 'paid' ? 'billed' : 'unbilled'}</span></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {finDocuments.filter(d => d.kind === 'project').length === 0 && <div className="card p-8 text-center text-sm text-slate-400">No projects — create one above, then log hours against it.</div>}
        </div>
      )}

      {/* ---------- SALES / PURCHASES / BANKING / JOURNALS ---------- */}
      {['sales', 'purchases', 'banking', 'journals'].includes(tab) && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {tab === 'sales' && <><button onClick={() => openForm('invoice')} className="btn-primary"><Plus size={13} />New invoice</button><button onClick={() => openForm('receipt')} className="btn-secondary"><Plus size={13} />Record receipt</button></>}
            {tab === 'purchases' && <><button onClick={() => openForm('bill')} className="btn-primary"><Plus size={13} />New bill</button><button onClick={() => openForm('payment')} className="btn-secondary"><Plus size={13} />Record payment</button><button onClick={() => openForm('expense')} className="btn-secondary"><Plus size={13} />New expense</button></>}
            {tab === 'banking' && <button onClick={() => openForm('bank')} className="btn-primary"><Plus size={13} />New bank transaction</button>}
            {tab === 'journals' && <><button onClick={() => openForm('journal')} className="btn-primary"><Plus size={13} />New manual journal</button><button onClick={() => { openForm('journal'); setF(v => ({ ...v, fx: '1' })); }} className="btn-secondary"><Plus size={13} />New FX adjustment</button></>}
          </div>

          {form && (
            <div className="card p-5 space-y-3 border-2 border-brand-200">
              <div className="flex items-center justify-between"><h3 className="font-black text-slate-900">{form.kind === 'journal' ? (f.fx ? 'FX currency adjustment' : 'Manual journal') : `New ${KIND_LABEL[form.kind]?.toLowerCase()}`}</h3><button onClick={() => setForm(null)} className="text-xs text-slate-400">Cancel</button></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><label className="label">Number</label><input className="input" value={f.no ?? ''} placeholder={nextNo(form.kind.slice(0, 3).toUpperCase(), form.kind)} onChange={e => setF(v => ({ ...v, no: e.target.value }))} /></div>
                <div><label className="label">Date</label><input className="input" type="date" value={f.date ?? today()} onChange={e => setF(v => ({ ...v, date: e.target.value }))} /></div>
                {['invoice', 'receipt', 'bill', 'payment'].includes(form.kind) && (
                  <div><label className="label">Contact</label><select className="select" value={f.contactId ?? ''} onChange={e => setF(v => ({ ...v, contactId: e.target.value }))}><option value="">—</option>{finContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                )}
                {['receipt', 'payment', 'bank'].includes(form.kind) && (
                  <div><label className="label">Bank / cash account</label><select className="select" value={f.bankAccountId ?? ''} onChange={e => setF(v => ({ ...v, bankAccountId: e.target.value }))}>{finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
                )}
                {form.kind === 'expense' && (
                  <div><label className="label">Paid from</label><select className="select" value={f.cashAccountId ?? 'acc_1000'} onChange={e => setF(v => ({ ...v, cashAccountId: e.target.value }))}>{finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
                )}
                {form.kind === 'invoice' && <div><label className="label">VAT (₦)</label><input className="input" type="number" min={0} value={f.vat ?? ''} onChange={e => setF(v => ({ ...v, vat: e.target.value }))} /></div>}
                {form.kind === 'bank' && (
                  <>
                    <div><label className="label">Direction</label><select className="select" value={f.direction ?? 'in'} onChange={e => setF(v => ({ ...v, direction: e.target.value }))}><option value="in">Money in</option><option value="out">Money out</option></select></div>
                    <div><label className="label">Amount (₦)</label><input className="input" type="number" min={0} value={f.amount ?? ''} onChange={e => setF(v => ({ ...v, amount: e.target.value }))} /></div>
                  </>
                )}
                {form.kind === 'journal' && <div className="col-span-2"><label className="label">Reference / notes</label><input className="input" value={f.memo ?? ''} onChange={e => setF(v => ({ ...v, memo: e.target.value }))} /></div>}
              </div>

              {/* lines */}
              <div className="space-y-2">
                {form.kind === 'journal' ? (
                  <>
                    {lines.map((l, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        {accountPicker(l.accountId, v => setLines(ls => ls.map((x, j) => j === i ? { ...x, accountId: v } : x)))}
                        <input className="input" placeholder="Debit (₦)" type="number" min={0} value={l.dr ?? ''} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, dr: e.target.value } : x))} />
                        <input className="input" placeholder="Credit (₦)" type="number" min={0} value={l.cr ?? ''} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, cr: e.target.value } : x))} />
                        <div className="flex gap-2"><input className="input" placeholder="Memo" onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, memo: e.target.value } : x))} />{lines.length > 1 && <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="text-red-400"><Trash2 size={14} /></button>}</div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setLines(ls => [...ls, { accountId: '', amount: '', memo: '' }])} className="btn-secondary text-xs"><Plus size={12} />Add line</button>
                  </>
                ) : (
                  <>
                    {lines.map((l, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        {accountPicker(l.accountId, v => setLines(ls => ls.map((x, j) => j === i ? { ...x, accountId: v } : x)), form.kind === 'invoice' ? ['Income', 'Other Income'] : form.kind === 'receipt' ? ['Accounts Receivable', 'Income', 'Other Current Liability'] : ['Expense', 'Cost of Goods Sold', 'Fixed Asset', 'Other Current Asset', 'Accounts Payable', 'Other Current Liability'])}
                        <input className="input" type="number" min={0} placeholder="Amount (₦)" value={l.amount} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                        <input className="input" placeholder="Memo" value={l.memo} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, memo: e.target.value } : x))} />
                        {lines.length > 1 ? <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="text-red-400 justify-self-start"><Trash2 size={14} /></button> : <span />}
                      </div>
                    ))}
                    <button type="button" onClick={() => setLines(ls => [...ls, { accountId: '', amount: '', memo: '' }])} className="btn-secondary text-xs"><Plus size={12} />Add line</button>
                  </>
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={() => {
                  if (form.kind === 'journal') {
                    setBusy(true);
                    postJournal({ no: f.no || nextNo(f.fx ? 'FX' : 'MJ', 'journal'), source: f.fx ? 'fx' : 'journal', date: f.date || today(), notes: f.memo, createdBy: me },
                      lines.map(l => ({ accountId: l.accountId, dr: Number(l.dr) || 0, cr: Number(l.cr) || 0, memo: l.memo })))
                      .then(() => setForm(null)).catch(reportSaveError).finally(() => setBusy(false));
                  } else void submitDoc();
                }} disabled={busy} className="btn-primary">{busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Post {KIND_LABEL[form.kind]?.toLowerCase()}</button>
              </div>
            </div>
          )}

          {(() => {
            const SUB: Record<string, string[]> = { invoices: ['invoice'], receipts: ['receipt'], bills: ['bill'], payments: ['payment'], expenses: ['expense'] };
            const kinds = SUB[pSub] ?? (tab === 'sales' ? ['invoice', 'receipt'] : tab === 'purchases' ? ['bill', 'payment', 'expense'] : tab === 'banking' ? ['bank'] : ['journal']);
            const docs = openDocs(kinds as FinDocKind[]);
            return (
              <div className="card divide-y divide-slate-100">
                {docs.map(docRow)}
                {docs.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Nothing posted yet.</p>}
              </div>
            );
          })()}
        </div>
      )}

      {/* ---------- REPORTS ---------- */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {/* Chart of accounts — editable by the accountant */}
          <form onSubmit={async e => { e.preventDefault(); const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>; try { await upsertFinAccount({ code: el.aCode.value.trim(), name: el.aName.value.trim(), type: el.aType.value }); e.currentTarget.reset(); } catch (err) { reportSaveError(err); } }} className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <div><label className="label">Account code</label><input name="aCode" className="input" placeholder="e.g. 6090" required /></div>
            <div className="col-span-2"><label className="label">Account name</label><input name="aName" className="input" placeholder="e.g. HVAC maintenance" required /></div>
            <div><label className="label">Type</label><select name="aType" className="select">{['Income','Other Income','Expense','Cost of Goods Sold','Other Expense','Cash','Bank','Accounts Receivable','Other Current Asset','Fixed Asset','Accounts Payable','Other Current Liability','Long Term Liability','Equity'].map(t => <option key={t}>{t}</option>)}</select></div>
            <button className="btn-primary text-xs"><Plus size={12} />Add / update account</button>
          </form>
          <div className="flex gap-2 flex-wrap">
            {([['tb', 'Trial balance'], ['pl', 'Profit & loss'], ['bs', 'Balance sheet'], ['acct', 'Account transactions'], ['budget', 'Budget vs actual']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setReport(id)} className={`px-3.5 py-2 text-xs font-bold rounded-lg ${report === id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>{label}</button>
            ))}
          </div>

          {report === 'tb' && (
            <div className="card p-5">
              <h2 className="font-black text-slate-900 mb-3">Trial balance</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100"><th className="py-2">Account</th><th>Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {finAccounts.filter(a => bal(a.id) !== 0).map(a => (
                    <tr key={a.id}><td className="py-1.5 font-semibold">{a.code} · {a.name}</td><td className="text-xs text-slate-400">{a.type}</td><td className="text-right tabular-nums">{bal(a.id) > 0 ? fmt(bal(a.id)) : ''}</td><td className="text-right tabular-nums">{bal(a.id) < 0 ? fmt(-bal(a.id)) : ''}</td></tr>
                  ))}
                  <tr className="font-black border-t-2 border-slate-200"><td className="py-2">Total</td><td /><td className="text-right tabular-nums">{fmt(finAccounts.reduce((s, a) => s + Math.max(0, bal(a.id)), 0))}</td><td className="text-right tabular-nums">{fmt(-finAccounts.reduce((s, a) => s + Math.min(0, bal(a.id)), 0))}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {report === 'pl' && (
            <div className="card p-5">
              <h2 className="font-black text-slate-900 mb-3">Profit &amp; loss</h2>
              {(['Income', 'Other Income'] as const).map(t => (
                <div key={t}><p className="text-[11px] font-bold uppercase text-slate-400 mt-3 mb-1">{t}</p>{finAccounts.filter(a => a.type === t && natural(a) !== 0).map(a => <div key={a.id} className="flex justify-between py-1 text-sm"><span>{a.name}</span><span className="tabular-nums">{fmt(natural(a))}</span></div>)}</div>
              ))}
              <div className="flex justify-between py-1.5 font-bold border-t border-slate-200 mt-1"><span>Total income</span><span className="tabular-nums">{fmt(pl.inc)}</span></div>
              {(['Cost of Goods Sold', 'Expense', 'Other Expense'] as const).map(t => (
                <div key={t}><p className="text-[11px] font-bold uppercase text-slate-400 mt-3 mb-1">{t}</p>{finAccounts.filter(a => a.type === t && natural(a) !== 0).map(a => <div key={a.id} className="flex justify-between py-1 text-sm"><span>{a.name}</span><span className="tabular-nums">({fmt(natural(a))})</span></div>)}</div>
              ))}
              <div className="flex justify-between py-1.5 font-bold border-t border-slate-200 mt-1"><span>Total expenses</span><span className="tabular-nums">({fmt(pl.exp)})</span></div>
              <div className={`flex justify-between py-2 font-black text-base border-t-2 border-slate-300 mt-2 ${pl.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}><span>Net result</span><span className="tabular-nums">{fmt(pl.net)}</span></div>
            </div>
          )}

          {report === 'bs' && (
            <div className="card p-5">
              <h2 className="font-black text-slate-900 mb-3">Balance sheet</h2>
              {([['Assets', ['Cash', 'Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset']], ['Liabilities', ['Accounts Payable', 'Other Current Liability', 'Long Term Liability']], ['Equity', ['Equity']]] as const).map(([title, types]) => (
                <div key={title}>
                  <p className="text-[11px] font-bold uppercase text-slate-400 mt-4 mb-1">{title}</p>
                  {finAccounts.filter(a => (types as readonly string[]).includes(a.type) && natural(a) !== 0).map(a => <div key={a.id} className="flex justify-between py-1 text-sm"><span>{a.code} · {a.name}</span><span className="tabular-nums">{fmt(natural(a))}</span></div>)}
                  <div className="flex justify-between py-1.5 font-bold border-t border-slate-200"><span>Total {title.toLowerCase()}</span><span className="tabular-nums">{fmt(finAccounts.filter(a => (types as readonly string[]).includes(a.type)).reduce((s, a) => s + natural(a), 0))}</span></div>
                </div>
              ))}
              <div className="flex justify-between py-1.5 text-sm mt-1"><span className="text-slate-500">Retained result (P&L)</span><span className="tabular-nums">{fmt(pl.net)}</span></div>
            </div>
          )}

          {report === 'acct' && (
            <div className="card p-5">
              <div className="mb-3"><select className="select max-w-xs" value={acctId} onChange={e => setAcctId(e.target.value)}><option value="">Pick an account…</option>{finAccounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
              {acctId && (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100"><th className="py-2">Date</th><th>Entry</th><th>Memo</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {finJournalEntries.filter(e => e.status === 'published' && finJournalLines.some(l => l.entryId === e.id && l.accountId === acctId)).map(e => (
                      finJournalLines.filter(l => l.entryId === e.id && l.accountId === acctId).map(l => (
                        <tr key={l.id}><td className="py-1.5 text-xs text-slate-500">{e.date}</td><td className="font-mono text-xs">{e.no}</td><td className="text-xs text-slate-500">{l.memo ?? e.ref ?? ''}</td><td className="text-right tabular-nums">{l.debit ? fmt(l.debit) : ''}</td><td className="text-right tabular-nums">{l.credit ? fmt(l.credit) : ''}</td></tr>
                      ))
                    ))}
                    <tr className="font-black border-t-2 border-slate-200"><td colSpan={3} className="py-2">Balance</td><td colSpan={2} className="text-right tabular-nums">{fmt(bal(acctId))}</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

          {report === 'budget' && (
            <div className="space-y-4">
              <div className="card p-5 space-y-3">
                <h2 className="font-black text-slate-900">New budget</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input className="input" placeholder="Budget name" value={budName} onChange={e => setBudName(e.target.value)} />
                  <input className="input" placeholder="Period (e.g. 2027)" value={budPeriod} onChange={e => setBudPeriod(e.target.value)} />
                </div>
                {budLines.map((l, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {accountPicker(l.accountId, v => setBudLines(ls => ls.map((x, j) => j === i ? { ...x, accountId: v } : x)))}
                    <input className="input" type="number" min={0} placeholder="Amount (₦)" value={l.amount} onChange={e => setBudLines(ls => ls.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                    {budLines.length > 1 ? <button type="button" onClick={() => setBudLines(ls => ls.filter((_, j) => j !== i))} className="text-red-400 justify-self-start"><Trash2 size={14} /></button> : <span />}
                  </div>
                ))}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setBudLines(ls => [...ls, { accountId: '', amount: '' }])} className="btn-secondary text-xs"><Plus size={12} />Add line</button>
                  <button onClick={async () => {
                    const ls = budLines.filter(l => l.accountId && Number(l.amount) > 0).map(l => ({ accountId: l.accountId, amount: Number(l.amount) }));
                    if (!budName.trim() || !ls.length) return alert('Name the budget and add at least one account line.');
                    try { await upsertFinBudget({ name: budName.trim(), period: budPeriod.trim(), lines: ls }); setBudName(''); setBudLines([{ accountId: '', amount: '' }]); } catch (e) { reportSaveError(e); }
                  }} className="btn-primary text-xs">Save budget</button>
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-black text-slate-900">Budget vs actual</h2>
                  <select className="select max-w-xs" value={budId} onChange={e => setBudId(e.target.value)}><option value="">Pick a budget…</option>{finBudgets.map(b => <option key={b.id} value={b.id}>{b.name} ({b.period})</option>)}</select>
                </div>
                {budId && (() => {
                  const b = finBudgets.find(x => x.id === budId)!;
                  return (
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100"><th className="py-2">Account</th><th className="text-right">Budget</th><th className="text-right">Actual</th><th className="text-right">Variance</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {b.lines.map(l => {
                          const a = finAccounts.find(x => x.id === l.accountId);
                          const actual = a ? natural(a) : 0;
                          const variance = actual - l.amount;
                          return <tr key={l.accountId}><td className="py-1.5 font-semibold">{a?.name ?? l.accountId}</td><td className="text-right tabular-nums">{fmt(l.amount)}</td><td className="text-right tabular-nums">{fmt(actual)}</td><td className={`text-right tabular-nums font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{variance >= 0 ? '+' : ''}{fmt(variance)}</td></tr>;
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

      {tab === 'import' && <FinImport />}

      {/* ---------- ACTIVITY ---------- */}
      {tab === 'activity' && (
        <div className="card p-5">
          <h2 className="font-black text-slate-900 mb-3">Activity log</h2>
          <div className="divide-y divide-slate-100">
            {finActivity.map(a => (
              <div key={a.id} className="py-2 flex items-center gap-3 text-sm"><span className="text-xs text-slate-400 w-36 flex-shrink-0">{new Date(a.at).toLocaleString('en-GB')}</span><span className="font-semibold text-slate-700">{a.actor}</span><span className="text-slate-500">{a.action}</span></div>
            ))}
            {finActivity.length === 0 && <p className="text-sm text-slate-400 py-4">No activity yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
