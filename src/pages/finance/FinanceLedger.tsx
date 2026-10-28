import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Package, TrendingUp, TrendingDown, Landmark, BookMarked, BarChart3, Activity, Plus, Loader2, Trash2, Upload, Paperclip } from 'lucide-react';
import FinImport from './FinImport';
import FinConnect from './FinConnect';
import { useStore } from '../../store/useStore';
import {
  createFinContact, upsertFinItem, deleteFinItem, createFinDocument, updateFinDocument,
  voidFinDocument, postJournal, logFinActivity, upsertFinBudget, upsertFinAccount, reclassifyFinLines, uploadFile,
  upsertFinRecurring, deleteFinRecurring, voidFinJournalEntry, publishFinJournalEntry, type PostLine,
} from '../../lib/db';
import { reportSaveError } from '../../store/useStore';
import type { FinAccount, FinDocument, FinDocKind } from '../../types';

const fmt = (v: number) => `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const r2 = (v: number) => Math.round(v * 100) / 100;
const addDays = (d: string, n: number) => { const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const PAYMENT_TERMS: [number, string][] = [[0, 'Due on receipt'], [7, 'Net 7'], [15, 'Net 15'], [30, 'Net 30'], [45, 'Net 45'], [60, 'Net 60']];

type Tab = 'home' | 'connect' | 'contacts' | 'items' | 'projects' | 'sales' | 'purchases' | 'banking' | 'journals' | 'reports' | 'activity' | 'import' | 'lock';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Landmark size={14} /> },
  { id: 'connect', label: 'How it connects', icon: <Landmark size={14} /> },
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
  { id: 'lock', label: 'Locking', icon: <Landmark size={14} /> },
];

const KIND_LABEL: Record<string, string> = { invoice: 'Invoice', receipt: 'Receipt', bill: 'Bill', payment: 'Payment', expense: 'Expense', bank: 'Bank txn', journal: 'Journal', quote: 'Quote', sales_order: 'Sales order', depreciation: 'Depreciation', credit_note: 'Credit note', vendor_credit: 'Vendor credit' };
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500', issued: 'bg-blue-100 text-blue-700', part_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700', void: 'bg-red-100 text-red-600', published: 'bg-emerald-100 text-emerald-700',
};

export default function FinanceLedger() {
  const { finAccounts, finJournalEntries, finJournalLines, finContacts, finItems, finDocuments, finBudgets, finActivity, finRecurring, currentUser, getBudgetSummaries } = useStore();
  const [recForm, setRecForm] = useState<null | { kind: 'invoice' | 'expense'; name: string; contactId: string; vat: string; memo: string; nextRun: string; endDate?: string; frequency: 'weekly' | 'monthly' | 'yearly'; paidThroughId: string }>(null);
  const [recLines, setRecLines] = useState<{ accountId: string; amount: string; memo: string }[]>([{ accountId: '', amount: '', memo: '' }]);
  const seg = useParams()['*'] ?? '';
  const [pTab, pSub] = seg.split('/');
  const tab = (TABS.some(t => t.id === pTab) ? pTab : 'home') as Tab;
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<'tb' | 'pl' | 'bs' | 'acct' | 'ar' | 'ap' | 'cf' | 'ratios' | 'tax' | 'budget'>('tb');
  const [acctId, setAcctId] = useState('');
  const [budId, setBudId] = useState('');
  const [budName, setBudName] = useState('');
  const [budPeriod, setBudPeriod] = useState(String(new Date().getFullYear()));
  const [budFreq, setBudFreq] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [budLines, setBudLines] = useState<{ accountId: string; amount: string }[]>([{ accountId: '', amount: '' }]);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [lockDate, setLockDate] = useState('');
  const [bulk, setBulk] = useState({ from: '', to: '' });
  const [itemAcc, setItemAcc] = useState('');
  const me = currentUser?.name ?? 'Finance';

  useEffect(() => {
    if (tab === 'reports' && pSub && ['tb', 'pl', 'bs', 'acct', 'ar', 'ap', 'cf', 'ratios', 'tax', 'budget'].includes(pSub)) setReport(pSub as typeof report);
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

  const lockUntil = finDocuments.filter(d => d.kind === 'lock' && d.status !== 'void').map(d => d.payload.date as string).sort().pop() ?? null;

  const post = async (doc: Omit<FinDocument, 'id' | 'createdAt'>, lines: PostLine[]) => {
    if (lockUntil && doc.date <= lockUntil) return alert(`Transactions on or before ${lockUntil} are locked. Unlock from the Transaction locking page first.`);
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
  const [lines, setLines] = useState<{ accountId: string; amount: string; memo: string; dr?: string; cr?: string; qty?: string; rate?: string; disc?: string; itemId?: string; contactId?: string }[]>([{ accountId: '', amount: '', memo: '' }]);
  const openForm = (kind: FinDocKind) => { setForm({ kind }); setF({ date: today(), bankAccountId: 'acc_1100', cashAccountId: 'acc_1000' }); setLines([{ accountId: '', amount: '', memo: '' }]); };

  const submitDoc = async (asDraft = false) => {
    if (!form) return;
    const k = form.kind;
    const lns = lines.filter(l => l.accountId && Number(l.amount) > 0);
    const total = r2(lns.reduce((s, l) => s + Number(l.amount), 0));
    if (k !== 'bank' && lns.length === 0) return alert('Add at least one line with an account and amount.');
    const base: Omit<FinDocument, 'id' | 'createdAt'> = { kind: k, no: f.no || nextNo(k.slice(0, 3).toUpperCase(), k), date: f.date || today(), status: asDraft ? 'draft' : 'issued', contactId: f.contactId || undefined, projectId: f.projectId || undefined, total, paid: 0, dueDate: f.dueDate || undefined, createdBy: me, payload: { lines: lns, memo: f.memo, method: f.method, bankAccountId: f.bankAccountId, linkedDocId: f.linkedDocId, orderNo: f.orderNo || undefined, refNo: f.refNo || undefined, subject: f.subject || undefined, salesperson: f.salesperson || undefined, customerNotes: f.customerNotes || undefined, termsText: f.termsText || undefined, expiryDate: f.expiryDate || undefined, terms: f.terms || undefined, arAccountId: f.arAccountId || undefined, apAccountId: f.apAccountId || undefined, billableContactId: f.billableContactId || undefined } };

    // Drafts save without posting to the ledger — Issue posts later.
    if (asDraft && ['invoice', 'quote', 'sales_order', 'bill'].includes(k)) {
      await createFinDocument({ ...base, payload: { ...base.payload, vat: Number(f.vat || 0) } }).then(() => undefined).catch(reportSaveError);
      setBusy(true); setForm(null); setBusy(false);
      return;
    }

    let jl: PostLine[] = [];
    const status: FinDocument['status'] = 'issued';
    if (k === 'invoice') {
      const vat = Number(f.vat || 0); const t = r2(total + vat);
      jl = [{ accountId: f.arAccountId || acct('1200')!, dr: t, memo: 'AR' }, ...lns.map(l => ({ accountId: l.accountId, cr: Number(l.amount), memo: l.memo }))];
      if (vat > 0) jl.push({ accountId: acct('2100')!, cr: vat, memo: 'VAT output' });
      await post({ ...base, total: t, status, payload: { ...base.payload, vat } }, jl);
      // Decrement tracked stock for item lines
      for (const l of lns) {
        const item = finItems.find(i => i.id === (l as { itemId?: string }).itemId);
        if (item?.stock != null) await upsertFinItem({ ...item, stock: Math.max(0, item.stock - 1) }).catch(reportSaveError);
      }
    } else if (k === 'quote' || k === 'sales_order') {
      const vat = Number(f.vat || 0); const t = r2(total + vat);
      await createFinDocument({ ...base, total: t, status: 'issued', payload: { ...base.payload, vat } }); // quotes/orders don't post to the ledger
    } else if (k === 'depreciation') {
      const amt = Number(f.amount || 0);
      if (amt <= 0 || !lns[0]?.accountId) return alert('Pick a fixed-asset account and monthly amount.');
      jl = [{ accountId: 'acc_6070', dr: amt, memo: `Depreciation — ${lns[0].memo ?? ''}` }, { accountId: 'acc_1510', cr: amt, memo: 'Accumulated depreciation' }];
      await post({ ...base, total: amt, status: 'paid', payload: { ...base.payload, assetAccountId: lns[0].accountId } }, jl);
    } else if (k === 'receipt') {
      const wht = Number(f.wht || 0);
      jl = [{ accountId: f.bankAccountId || acct('1100')!, dr: r2(total - wht), memo: 'Amount received' }, ...lns.map(l => ({ accountId: l.accountId, cr: Number(l.amount), memo: l.memo }))];
      if (wht > 0) jl.splice(1, 0, { accountId: acct('1320')!, dr: wht, memo: 'WHT deducted by customer' });
      const linked = finDocuments.find(d => d.id === f.linkedDocId);
      if (linked) {
        const paid = r2(linked.paid + total);
        await updateFinDocument(linked.id, { paid, status: paid >= linked.total - 0.005 ? 'paid' : 'part_paid' }).catch(reportSaveError);
      }
      await post({ ...base, status: 'paid', paid: total }, jl);
    } else if (k === 'credit_note') {
      // Reverses billed income: DR income lines (+ DR VAT output) / CR AR. Linked invoice's billed total drops.
      const vat = Number(f.vat || 0); const t = r2(total + vat);
      jl = [...lns.map(l => ({ accountId: l.accountId, dr: Number(l.amount), memo: l.memo }))];
      if (vat > 0) jl.push({ accountId: acct('2100')!, dr: vat, memo: 'VAT output reversal' });
      jl.push({ accountId: f.arAccountId || acct('1200')!, cr: t, memo: 'Credit to customer' });
      const linked = finDocuments.find(d => d.id === f.linkedDocId);
      if (linked) {
        const newTotal = Math.max(linked.paid, r2(linked.total - t));
        await updateFinDocument(linked.id, { total: newTotal, status: linked.paid >= newTotal - 0.005 ? 'paid' : linked.paid > 0 ? 'part_paid' : 'issued' }).catch(reportSaveError);
      }
      await post({ ...base, total: t, status: 'paid', payload: { ...base.payload, vat } }, jl);
    } else if (k === 'vendor_credit') {
      // Vendor credit note: DR AP / CR expense lines (+ CR VAT input). Linked bill's total drops.
      const vat = Number(f.vat || 0); const t = r2(total + vat);
      jl = [{ accountId: f.apAccountId || acct('2000')!, dr: t, memo: 'Credit from vendor' }];
      if (vat > 0) jl.push({ accountId: acct('1330')!, cr: vat, memo: 'VAT input reversal' });
      jl.push(...lns.map(l => ({ accountId: l.accountId, cr: Number(l.amount), memo: l.memo })));
      const linked = finDocuments.find(d => d.id === f.linkedDocId);
      if (linked) {
        const newTotal = Math.max(linked.paid, r2(linked.total - t));
        await updateFinDocument(linked.id, { total: newTotal, status: linked.paid >= newTotal - 0.005 ? 'paid' : linked.paid > 0 ? 'part_paid' : 'issued' }).catch(reportSaveError);
      }
      await post({ ...base, total: t, status: 'paid', payload: { ...base.payload, vat } }, jl);
    } else if (k === 'bill') {
      const vat = Number(f.vat || 0); const t = r2(total + vat);
      jl = [...lns.map(l => ({ accountId: l.accountId, dr: Number(l.amount), memo: l.memo }))];
      if (vat > 0) jl.push({ accountId: acct('1330')!, dr: vat, memo: 'VAT input' });
      jl.push({ accountId: f.apAccountId || acct('2000')!, cr: t });
      await post({ ...base, total: t, status, payload: { ...base.payload, vat } }, jl);
    } else if (k === 'payment') {
      const wht = Number(f.wht || 0);
      jl = [{ accountId: acct('2000')!, dr: total }, { accountId: f.bankAccountId || acct('1100')!, cr: r2(total - wht), memo: 'Amount paid' }];
      if (wht > 0) jl.push({ accountId: acct('2110')!, cr: wht, memo: 'WHT withheld from vendor' });
      const linked = finDocuments.find(d => d.id === f.linkedDocId);
      if (linked) {
        const paid = r2(linked.paid + total);
        await updateFinDocument(linked.id, { paid, status: paid >= linked.total - 0.005 ? 'paid' : 'part_paid' }).catch(reportSaveError);
      }
      await post({ ...base, status: 'paid' }, jl);
    } else if (k === 'expense') {
      const vat = Number(f.vat || 0); const t = r2(total + vat);
      jl = [...lns.map(l => ({ accountId: l.accountId, dr: Number(l.amount), memo: l.memo }))];
      if (vat > 0) jl.push({ accountId: acct('1330')!, dr: vat, memo: 'VAT input' });
      jl.push({ accountId: f.cashAccountId || acct('1000')!, cr: t });
      await post({ ...base, total: t, status: 'paid' }, jl);
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
      {d.status === 'draft' && (
        <button onClick={async () => {
          const ls = (d.payload.lines as { accountId: string; amount: string; memo?: string }[] | undefined) ?? [];
          const vat = Number(d.payload.vat ?? 0);
          try {
            if (d.kind === 'invoice') {
              await postJournal({ no: d.no, source: 'invoice', sourceId: d.id, date: d.date, ref: d.payload.memo as string | undefined, createdBy: me },
                [{ accountId: (d.payload.arAccountId as string) || acct('1200')!, dr: d.total, memo: 'AR' }, ...ls.map(l => ({ accountId: l.accountId, cr: Number(l.amount), memo: l.memo })), ...(vat > 0 ? [{ accountId: acct('2100')!, cr: vat, memo: 'VAT output' }] : [])]);
            } else if (d.kind === 'bill') {
              await postJournal({ no: d.no, source: 'bill', sourceId: d.id, date: d.date, ref: d.payload.memo as string | undefined, createdBy: me },
                [...ls.map(l => ({ accountId: l.accountId, dr: Number(l.amount), memo: l.memo })), ...(vat > 0 ? [{ accountId: acct('1330')!, dr: vat, memo: 'VAT input' }] : []), { accountId: acct('2000')!, cr: d.total }]);
            }
            await updateFinDocument(d.id, { status: 'issued' });
            await logFinActivity(me, `Issued ${d.no}`, d.no);
          } catch (e) { reportSaveError(e); }
        }} className="text-[11px] font-bold text-brand-600 whitespace-nowrap">Issue</button>
      )}
      {['issued', 'part_paid'].includes(d.status) && ['invoice', 'bill'].includes(d.kind) && (
        <button onClick={() => { const k = d.kind === 'invoice' ? 'receipt' : 'payment'; openForm(k); setF(v => ({ ...v, linkedDocId: d.id, contactId: d.contactId ?? '' })); setLines([{ accountId: acct(d.kind === 'invoice' ? '1200' : '2000')!, amount: String(r2(d.total - d.paid)), memo: `${KIND_LABEL[d.kind]} ${d.no}` }]); }} className="text-[11px] font-bold text-brand-600 whitespace-nowrap">{d.kind === 'invoice' ? 'Record receipt' : 'Record payment'}</button>
      )}
      {['quote', 'sales_order'].includes(d.kind) && d.status === 'issued' && (
        <button onClick={async () => {
          const ls = (d.payload.lines as { accountId: string; amount: string; memo: string }[] | undefined) ?? [];
          const vat = Number(d.payload.vat ?? 0); const t = r2(d.total);
          await post(
            { kind: 'invoice', no: nextNo('INV', 'invoice'), date: today(), status: 'issued', contactId: d.contactId, total: t, paid: 0, createdBy: me, payload: { lines: ls, convertedFrom: d.no } },
            [{ accountId: acct('1200')!, dr: t, memo: `AR — from ${d.no}` }, ...ls.map(l => ({ accountId: l.accountId, cr: Number(l.amount), memo: l.memo })), ...(vat > 0 ? [{ accountId: acct('2100')!, cr: vat, memo: 'VAT output' }] : [])],
          );
          await updateFinDocument(d.id, { status: 'void' }).catch(reportSaveError);
        }} className="text-[11px] font-bold text-brand-600 whitespace-nowrap">Convert to invoice</button>
      )}
      <button onClick={() => setViewId(v => v === d.id ? null : d.id)} className="text-[11px] font-semibold text-brand-600 whitespace-nowrap">View</button>
      {finJournalEntries.some(e => e.sourceId === d.id) && (
        <button onClick={() => setExpandId(exp => exp === d.id ? null : d.id)} className="text-[11px] font-semibold text-brand-600 whitespace-nowrap">Ledger impact</button>
      )}
      {d.status !== 'void' && (
        <label className="text-slate-400 hover:text-brand-600 cursor-pointer" title="Attach a file">
          <Paperclip size={13} />
          <input type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void attach(d, file); e.target.value = ''; }} />
        </label>
      )}
      {d.status !== 'void' && <button onClick={() => void voidDoc(d)} className="text-[11px] text-red-500 font-semibold">Void</button>}
    </div>
    {viewId === d.id && (() => {
      const ls = (d.payload.lines as { accountId: string; amount: string; memo?: string; qty?: string; rate?: string }[] | undefined) ?? [];
      const contact = finContacts.find(c => c.id === d.contactId);
      const vat = Number(d.payload.vat ?? (d.kind === 'invoice' || d.kind === 'bill' ? r2(d.total - ls.reduce((s, l) => s + Number(l.amount || 0), 0)) : 0));
      const subtotal = r2(d.total - vat);
      const title = KIND_LABEL[d.kind] ?? d.kind;
      return (
        <div className="mt-2 mx-2 rounded-xl border border-slate-200 bg-white p-5 print-doc">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Propel Works Management Systems</p>
              <h3 className="text-lg font-black text-slate-900">{title} {d.no}</h3>
              {d.payload.subject ? <p className="text-xs text-slate-500 italic mt-0.5">{String(d.payload.subject as string)}</p> : null}
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Date: <strong>{d.date}</strong></p>
              {d.dueDate && <p>Due: <strong>{d.dueDate}</strong></p>}
              {d.payload.expiryDate ? <p>Expires: <strong>{String(d.payload.expiryDate as string)}</strong></p> : null}
              {d.payload.orderNo ? <p>Order #: <strong>{String(d.payload.orderNo as string)}</strong></p> : null}
              {d.payload.refNo ? <p>Ref #: <strong>{String(d.payload.refNo as string)}</strong></p> : null}
              {d.payload.salesperson ? <p>Salesperson: <strong>{String(d.payload.salesperson as string)}</strong></p> : null}
              {d.payload.method ? <p>Method: <strong>{String(d.payload.method as string).replace('_', ' ')}</strong></p> : null}
            </div>
          </div>
          {contact && (
            <div className="mb-4 text-xs">
              <p className="font-bold uppercase text-slate-400 text-[10px]">{['bill', 'payment', 'expense'].includes(d.kind) ? 'Vendor' : 'Bill to'}</p>
              <p className="font-bold text-slate-800">{contact.name}</p>
              {contact.address && <p className="text-slate-500">{contact.address}</p>}
              {contact.email && <p className="text-slate-500">{contact.email}</p>}
              {contact.bankAccountNo && <p className="text-slate-500">Bank: {contact.bankName ?? ''} · {contact.bankAccountNo}{contact.bankCode ? ` · ${contact.bankCode}` : ''}</p>}
            </div>
          )}
          <table className="w-full text-xs mb-4">
            <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase text-slate-400 font-bold">
              <th className="py-1.5">Description</th><th className="py-1.5">Account</th><th className="py-1.5 text-right">Qty</th><th className="py-1.5 text-right">Rate</th><th className="py-1.5 text-right">Disc %</th><th className="py-1.5 text-right">Amount</th>
            </tr></thead>
            <tbody>
              {ls.map((l, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-1.5 text-slate-700">{l.memo || '—'}</td>
                  <td className="py-1.5 text-slate-500">{accName(l.accountId)}</td>
                  <td className="py-1.5 text-right tabular-nums">{l.qty ?? '—'}</td>
                  <td className="py-1.5 text-right tabular-nums">{l.rate ? fmt(Number(l.rate)) : '—'}</td>
                  <td className="py-1.5 text-right tabular-nums">{(l as { disc?: string }).disc ? `${(l as { disc?: string }).disc}%` : '—'}</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{fmt(Number(l.amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
              {vat > 0 && <div className="flex justify-between text-slate-600"><span>VAT</span><span className="tabular-nums">{fmt(vat)}</span></div>}
              <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-1"><span>Total</span><span className="tabular-nums">{fmt(d.total)}</span></div>
              {d.paid > 0 && <div className="flex justify-between text-emerald-600"><span>Paid</span><span className="tabular-nums">{fmt(d.paid)}</span></div>}
            </div>
          </div>
          {d.payload.memo ? <p className="text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-2">{String(d.payload.memo as string)}</p> : null}
          {d.payload.customerNotes ? (
            <div className="mt-3 border-t border-slate-100 pt-2"><p className="text-[10px] font-bold uppercase text-slate-400">Customer notes</p><p className="text-[11px] text-slate-600 whitespace-pre-line">{String(d.payload.customerNotes as string)}</p></div>
          ) : null}
          {d.payload.termsText ? (
            <div className="mt-2 border-t border-slate-100 pt-2"><p className="text-[10px] font-bold uppercase text-slate-400">Terms &amp; conditions</p><p className="text-[11px] text-slate-600 whitespace-pre-line">{String(d.payload.termsText as string)}</p></div>
          ) : null}
          <div className="flex justify-end mt-3">
            <button onClick={() => window.print()} className="btn-secondary text-xs">Print</button>
          </div>
        </div>
      );
    })()}
    {expandId === d.id && (() => {
      const e = finJournalEntries.find(x => x.sourceId === d.id);
      const ls = e ? finJournalLines.filter(l => l.entryId === e.id) : [];
      return (
        <div className="mt-2 ml-28 mr-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Ledger impact — {e?.no} ({e?.status})</p>
          <table className="w-full text-xs"><tbody>
            {ls.map(l => <tr key={l.id}><td className="py-1">{accName(l.accountId)}</td><td className="text-slate-400">{l.memo ?? ''}{l.contactId ? ` · ${contactName(l.contactId)}` : ''}</td><td className="text-right tabular-nums">{l.debit ? `DR ${fmt(l.debit)}` : ''}</td><td className="text-right tabular-nums">{l.credit ? `CR ${fmt(l.credit)}` : ''}</td></tr>)}
          </tbody></table>
        </div>
      );
    })()}
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

  const navigate = useNavigate();
  const Landing = ({ title, blurb, cta, onCta, steps }: { title: string; blurb: string; cta: string; onCta: () => void; steps: string[] }) => (
    <div className="card p-10 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-2">Propel Finance</p>
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{blurb}</p>
      <button onClick={onCta} className="btn-primary mt-5"><Plus size={13} />{cta}</button>
      <button onClick={() => navigate('/finance/ledger/import')} className="block mx-auto mt-3 text-xs font-bold text-brand-600 hover:underline">Import via CSV →</button>
      <p className="text-[10px] font-bold uppercase text-slate-400 mt-8 mb-2">Lifecycle</p>
      <div className="flex items-center justify-center gap-2 flex-wrap">{steps.map((s, i) => (
        <span key={i} className="flex items-center gap-2"><span className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-500">{s}</span>{i < steps.length - 1 && <span className="text-slate-300 text-xs">→</span>}</span>
      ))}</div>
    </div>
  );
  const LANDING: Record<string, { title: string; blurb: string; cta: string; kind: FinDocKind; steps: string[] }> = {
    quotes: { title: 'Quote. Negotiate. Convert.', blurb: 'Send a priced proposal, then convert it to an invoice when accepted — nothing posts to the ledger until it becomes an invoice.', cta: 'New quote', kind: 'quote', steps: ['Create quote', 'Customer accepts', 'Convert to invoice', 'Record receipt'] },
    sorders: { title: 'Confirm orders. Then invoice.', blurb: 'Sales orders confirm what a customer committed to before fulfilment — convert to an invoice when done.', cta: 'New sales order', kind: 'sales_order', steps: ['Create order', 'Fulfil', 'Convert to invoice', 'Record receipt'] },
    invoices: { title: 'Bill customers. Get paid.', blurb: 'Every invoice posts DR Accounts Receivable / CR income (+ VAT) and tracks what each customer still owes.', cta: 'New invoice', kind: 'invoice', steps: ['Create invoice', 'Customer pays', 'Record receipt', 'Balance settled'] },
    receipts: { title: 'Record money received.', blurb: 'Receipts settle open invoices — DR bank/cash / CR AR, with WHT-deducted handling built in.', cta: 'Record receipt', kind: 'receipt', steps: ['Customer pays', 'Record receipt', 'Invoice settled', 'Ledger updated'] },
    cnotes: { title: 'Issue credit notes.', blurb: 'Reduce what a customer owes — returns, corrections, agreed discounts. Posts the reversal and can apply to an open invoice.', cta: 'New credit note', kind: 'credit_note', steps: ['Issue credit', 'Apply to invoice', 'AR reduced', 'Ledger updated'] },
    bills: { title: 'Track what you owe vendors.', blurb: 'Bills post DR expense/asset / CR Accounts Payable and drive the payables aging until paid.', cta: 'New bill', kind: 'bill', steps: ['Vendor sends bill', 'Record bill', 'Record payment', 'Bill settled'] },
    payments: { title: 'Record payments made.', blurb: 'Payments settle open bills — DR AP / CR bank, with WHT withheld from vendors posted correctly.', cta: 'Record payment', kind: 'payment', steps: ['Pay vendor', 'Record payment', 'Bill settled', 'Ledger updated'] },
    expenses: { title: 'Time to manage your expenses!', blurb: 'Record operating costs as they happen — petty cash, fuel, subscriptions — straight to the right expense account.', cta: 'Record expense', kind: 'expense', steps: ['Expense incurred', 'Record expense', 'Billable → invoice / Non-billable → absorbed'] },
    vcredits: { title: 'Record vendor credits.', blurb: 'Reduce what you owe a vendor — returned goods, overbilling corrections. Posts the reversal and can apply to an open bill.', cta: 'New vendor credit', kind: 'vendor_credit', steps: ['Vendor issues credit', 'Apply to bill', 'AP reduced', 'Ledger updated'] },
  };

  return (
    <div className="space-y-5">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Finance</p>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><BookOpen size={20} />Ledger</h1>
          <p className="text-white/60 text-sm mt-1">Double-entry books — every document posts a balanced journal.</p>
        </div>
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
          {(() => {
            const overdue = finDocuments.filter(d => d.kind === 'invoice' && ['issued', 'part_paid'].includes(d.status) && (d.dueDate ?? d.date) < today()).sort((a, b) => (a.dueDate ?? a.date).localeCompare(b.dueDate ?? b.date));
            if (!overdue.length) return null;
            return (
              <div className="card p-5 border-l-4 border-red-400">
                <h2 className="font-black text-slate-900 mb-2">Overdue receivables — send reminders</h2>
                <div className="divide-y divide-slate-50">
                  {overdue.map(d => (
                    <div key={d.id} className="py-2 flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs">{d.no}</span>
                      <span className="flex-1 font-semibold">{contactName(d.contactId)}</span>
                      <span className="text-xs text-red-500">{Math.floor((Date.now() - new Date(d.dueDate ?? d.date).getTime()) / 86400000)}d overdue</span>
                      <span className="font-black tabular-nums">{fmt(d.total - d.paid)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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
          <form onSubmit={async e => { e.preventDefault(); const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>; setBusy(true); try { await createFinContact({ name: el.cName.value, type: el.cType.value as 'customer' | 'vendor' | 'both', email: el.cEmail.value, phone: el.cPhone.value, address: el.cAddr.value, bankName: el.cBank.value || undefined, bankAccountNo: el.cBankNo.value || undefined, bankCode: el.cBankCode.value || undefined }); e.currentTarget.reset(); } catch (err) { reportSaveError(err); } finally { setBusy(false); } }} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl">
            <input name="cName" className="input" placeholder="Name" required />
            <select name="cType" className="select"><option value="customer">Customer</option><option value="vendor">Vendor</option><option value="both">Both</option></select>
            <input name="cEmail" className="input" type="email" placeholder="Email" />
            <input name="cPhone" className="input" placeholder="Phone" />
            <input name="cAddr" className="input col-span-2" placeholder="Billing address" />
            <input name="cBank" className="input" placeholder="Bank name" />
            <input name="cBankNo" className="input" placeholder="Account number" />
            <input name="cBankCode" className="input" placeholder="Sort / bank code" />
            <button className="btn-primary" disabled={busy}><Plus size={13} />Add</button>
          </form>
          <div className="divide-y divide-slate-100">
            {finContacts.map(c => (
              <div key={c.id} className="py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{c.name} <span className="badge bg-slate-100 text-slate-600 ml-1">{c.type}</span></p>
                  <p className="text-xs text-slate-400">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
                  {c.bankAccountNo && <p className="text-xs text-slate-500 mt-0.5">🏦 {c.bankName ?? ''} · {c.bankAccountNo}{c.bankCode ? ` · ${c.bankCode}` : ''}</p>}
                </div>
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
          <form onSubmit={async e => { e.preventDefault(); const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>; setBusy(true); try { await upsertFinItem({ name: el.iName.value, description: el.iDesc.value, price: Number(el.iPrice.value) || 0, accountId: itemAcc || undefined, stock: el.iStock.value === '' ? undefined : Number(el.iStock.value) }); e.currentTarget.reset(); setItemAcc(''); } catch (err) { reportSaveError(err); } finally { setBusy(false); } }} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl">
            <input name="iName" className="input" placeholder="Item / service" required />
            <input name="iDesc" className="input" placeholder="Description" />
            <input name="iPrice" className="input" type="number" min={0} step="0.01" placeholder="Default price (₦)" />
            <input name="iStock" className="input" type="number" min={0} step="1" placeholder="Stock (opt.)" />
            <div>{accountPicker(itemAcc, setItemAcc, ['Income', 'Other Income'])}</div>
            <button className="btn-primary" disabled={busy}><Plus size={13} />Add</button>
          </form>
          <div className="divide-y divide-slate-100">
            {finItems.map(i => (
              <div key={i.id} className="py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1"><p className="font-bold text-slate-800">{i.name}</p>{i.description && <p className="text-xs text-slate-400">{i.description}</p>}</div>
                <span className="text-xs text-slate-400">{accName(i.accountId)}</span>
                {i.stock != null && <span className={`text-[11px] font-bold ${i.stock <= 5 ? 'text-red-600' : 'text-slate-500'}`}>{i.stock} in stock</span>}
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
            {tab === 'sales' && (!pSub || pSub === 'quotes') && <button onClick={() => openForm('quote')} className="btn-secondary"><Plus size={13} />New quote</button>}
            {tab === 'sales' && (!pSub || pSub === 'sorders') && <button onClick={() => openForm('sales_order')} className="btn-secondary"><Plus size={13} />New sales order</button>}
            {tab === 'sales' && (!pSub || pSub === 'invoices') && <button onClick={() => openForm('invoice')} className="btn-primary"><Plus size={13} />New invoice</button>}
            {tab === 'sales' && (!pSub || pSub === 'receipts') && <button onClick={() => openForm('receipt')} className="btn-secondary"><Plus size={13} />Record receipt</button>}
            {tab === 'sales' && pSub === 'cnotes' && <button onClick={() => openForm('credit_note')} className="btn-primary"><Plus size={13} />New credit note</button>}
            {tab === 'purchases' && pSub === 'vcredits' && <button onClick={() => openForm('vendor_credit')} className="btn-primary"><Plus size={13} />New vendor credit</button>}
            {tab === 'sales' && pSub === 'recurring' && <button onClick={() => setRecForm({ kind: 'invoice', name: '', contactId: '', vat: '', memo: '', nextRun: today(), frequency: 'monthly', paidThroughId: '' })} className="btn-primary"><Plus size={13} />New recurring invoice</button>}
            {tab === 'purchases' && pSub === 'recexpenses' && <button onClick={() => setRecForm({ kind: 'expense', name: '', contactId: '', vat: '', memo: '', nextRun: today(), frequency: 'monthly', paidThroughId: 'acc_1000' })} className="btn-primary"><Plus size={13} />New recurring expense</button>}
            {tab === 'purchases' && (!pSub || pSub === 'bills') && <button onClick={() => openForm('bill')} className="btn-primary"><Plus size={13} />New bill</button>}
            {tab === 'purchases' && (!pSub || pSub === 'payments') && <button onClick={() => openForm('payment')} className="btn-secondary"><Plus size={13} />Record payment</button>}
            {tab === 'purchases' && (!pSub || pSub === 'expenses') && <button onClick={() => openForm('expense')} className="btn-secondary"><Plus size={13} />New expense</button>}
            {tab === 'banking' && <button onClick={() => openForm('bank')} className="btn-primary"><Plus size={13} />New bank transaction</button>}
            {tab === 'journals' && <><button onClick={() => openForm('journal')} className="btn-primary"><Plus size={13} />New manual journal</button><button onClick={() => { openForm('journal'); setF(v => ({ ...v, fx: '1' })); }} className="btn-secondary"><Plus size={13} />New FX adjustment</button><button onClick={() => { openForm('depreciation'); setLines([{ accountId: '', amount: '0', memo: '' }]); }} className="btn-secondary"><Plus size={13} />Post depreciation</button></>}
          </div>

          {form && (
            <div className="card p-5 space-y-3 border-2 border-brand-200">
              <div className="flex items-center justify-between"><h3 className="font-black text-slate-900">{form.kind === 'journal' ? (f.fx ? 'FX currency adjustment' : 'Manual journal') : `New ${KIND_LABEL[form.kind]?.toLowerCase()}`}</h3><button onClick={() => setForm(null)} className="text-xs text-slate-400">Cancel</button></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><label className="label">Number</label><input className="input" value={f.no ?? ''} placeholder={nextNo(form.kind.slice(0, 3).toUpperCase(), form.kind)} onChange={e => setF(v => ({ ...v, no: e.target.value }))} /></div>
                <div><label className="label">Date</label><input className="input" type="date" value={f.date ?? today()} onChange={e => setF(v => ({ ...v, date: e.target.value }))} /></div>
                {['invoice', 'sales_order', 'bill'].includes(form.kind) && (
                  <div><label className="label">{form.kind === 'sales_order' ? 'Expected delivery' : 'Due date'}</label><input className="input" type="date" value={f.dueDate ?? ''} onChange={e => setF(v => ({ ...v, dueDate: e.target.value }))} /></div>
                )}
                {['invoice', 'bill'].includes(form.kind) && (
                  <div><label className="label">Payment terms</label><select className="select" value={f.terms ?? ''} onChange={e => { const days = Number(e.target.value); setF(v => ({ ...v, terms: e.target.value, dueDate: addDays(v.date || today(), days) })); }}><option value="">Custom due date…</option>{PAYMENT_TERMS.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></div>
                )}
                {form.kind === 'quote' && (
                  <>
                    <div><label className="label">Reference #</label><input className="input" value={f.refNo ?? ''} onChange={e => setF(v => ({ ...v, refNo: e.target.value }))} /></div>
                    <div><label className="label">Expiry date</label><input className="input" type="date" value={f.expiryDate ?? ''} onChange={e => setF(v => ({ ...v, expiryDate: e.target.value }))} /></div>
                  </>
                )}
                {['invoice', 'bill'].includes(form.kind) && (
                  <div><label className="label">Order number</label><input className="input" value={f.orderNo ?? ''} onChange={e => setF(v => ({ ...v, orderNo: e.target.value }))} /></div>
                )}
                {['invoice', 'receipt', 'bill', 'payment', 'quote', 'sales_order', 'expense', 'credit_note', 'vendor_credit'].includes(form.kind) && (
                  <div><label className="label">{['bill', 'payment', 'expense', 'vendor_credit'].includes(form.kind) ? 'Vendor' : 'Customer'}</label><select className="select" value={f.contactId ?? ''} onChange={e => setF(v => ({ ...v, contactId: e.target.value }))}><option value="">—</option>{finContacts.filter(c => ['bill', 'payment', 'expense', 'vendor_credit'].includes(form.kind) ? c.type !== 'customer' : c.type !== 'vendor').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                )}
                {['credit_note'].includes(form.kind) && (
                  <div><label className="label">Apply to invoice (opt.)</label><select className="select" value={f.linkedDocId ?? ''} onChange={e => setF(v => ({ ...v, linkedDocId: e.target.value }))}><option value="">Standalone credit</option>{finDocuments.filter(d => d.kind === 'invoice' && ['issued', 'part_paid'].includes(d.status)).map(d => <option key={d.id} value={d.id}>{d.no} — {contactName(d.contactId)} ({fmt(r2(d.total - d.paid))} open)</option>)}</select></div>
                )}
                {['vendor_credit'].includes(form.kind) && (
                  <div><label className="label">Apply to bill (opt.)</label><select className="select" value={f.linkedDocId ?? ''} onChange={e => setF(v => ({ ...v, linkedDocId: e.target.value }))}><option value="">Standalone credit</option>{finDocuments.filter(d => d.kind === 'bill' && ['issued', 'part_paid'].includes(d.status)).map(d => <option key={d.id} value={d.id}>{d.no} — {contactName(d.contactId)} ({fmt(r2(d.total - d.paid))} open)</option>)}</select></div>
                )}
                {form.kind === 'expense' && (
                  <div><label className="label">Customer — billable (opt.)</label><select className="select" value={f.billableContactId ?? ''} onChange={e => setF(v => ({ ...v, billableContactId: e.target.value }))}><option value="">Not billable</option>{finContacts.filter(c => c.type !== 'vendor').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                )}
                {['invoice', 'quote', 'sales_order'].includes(form.kind) && finDocuments.some(d => d.kind === 'project') && (
                  <div><label className="label">Project (opt.)</label><select className="select" value={f.projectId ?? ''} onChange={e => setF(v => ({ ...v, projectId: e.target.value }))}><option value="">—</option>{finDocuments.filter(d => d.kind === 'project').map(d => <option key={d.id} value={d.id}>{String(d.payload.name ?? d.no)}</option>)}</select></div>
                )}
                {['invoice', 'quote', 'sales_order'].includes(form.kind) && (
                  <div><label className="label">Salesperson (opt.)</label><input className="input" value={f.salesperson ?? ''} onChange={e => setF(v => ({ ...v, salesperson: e.target.value }))} /></div>
                )}
                {['invoice', 'quote', 'sales_order', 'bill', 'credit_note', 'vendor_credit'].includes(form.kind) && (
                  <div className="col-span-2"><label className="label">Subject</label><input className="input" placeholder="What this document is for" value={f.subject ?? ''} onChange={e => setF(v => ({ ...v, subject: e.target.value }))} /></div>
                )}
                {['receipt', 'payment', 'expense', 'bank', 'bill'].includes(form.kind) && (
                  <div><label className="label">Reference #</label><input className="input" placeholder="Receipt / cheque / transfer ref" value={f.refNo ?? ''} onChange={e => setF(v => ({ ...v, refNo: e.target.value }))} /></div>
                )}
                {['invoice', 'credit_note'].includes(form.kind) && (
                  <div><label className="label">Accounts receivable</label><select className="select" value={f.arAccountId ?? acct('1200') ?? ''} onChange={e => setF(v => ({ ...v, arAccountId: e.target.value }))}>{finAccounts.filter(a => a.type === 'Accounts Receivable').map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
                )}
                {['bill', 'vendor_credit'].includes(form.kind) && (
                  <div><label className="label">Accounts payable</label><select className="select" value={f.apAccountId ?? acct('2000') ?? ''} onChange={e => setF(v => ({ ...v, apAccountId: e.target.value }))}>{finAccounts.filter(a => a.type === 'Accounts Payable').map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
                )}
                {['receipt', 'payment', 'bank'].includes(form.kind) && (
                  <>
                    <div><label className="label">Bank / cash account</label><select className="select" value={f.bankAccountId ?? ''} onChange={e => setF(v => ({ ...v, bankAccountId: e.target.value }))}>{finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
                    <div><label className="label">Payment method</label><select className="select" value={f.method ?? 'bank_transfer'} onChange={e => setF(v => ({ ...v, method: e.target.value }))}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="pos">POS</option><option value="cheque">Cheque</option><option value="online">Online payment</option></select></div>
                  </>
                )}
                {form.kind === 'expense' && (
                  <div><label className="label">Paid from</label><select className="select" value={f.cashAccountId ?? 'acc_1000'} onChange={e => setF(v => ({ ...v, cashAccountId: e.target.value }))}>{finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div>
                )}
                {['invoice', 'bill', 'expense', 'quote', 'sales_order', 'credit_note', 'vendor_credit'].includes(form.kind) && <div><label className="label">VAT (₦)</label><input className="input" type="number" min={0} value={f.vat ?? ''} onChange={e => setF(v => ({ ...v, vat: e.target.value }))} /></div>}
                {form.kind === 'depreciation' && <div><label className="label">Monthly depreciation (₦)</label><input className="input" type="number" min={0} value={f.amount ?? ''} onChange={e => setF(v => ({ ...v, amount: e.target.value }))} /></div>}
                {form.kind === 'receipt' && <div><label className="label">WHT deducted by customer (₦)</label><input className="input" type="number" min={0} value={f.wht ?? ''} onChange={e => setF(v => ({ ...v, wht: e.target.value }))} /></div>}
                {form.kind === 'payment' && <div><label className="label">WHT withheld from vendor (₦)</label><input className="input" type="number" min={0} value={f.wht ?? ''} onChange={e => setF(v => ({ ...v, wht: e.target.value }))} /></div>}
                {form.kind === 'bank' && (
                  <>
                    <div><label className="label">Direction</label><select className="select" value={f.direction ?? 'in'} onChange={e => setF(v => ({ ...v, direction: e.target.value }))}><option value="in">Money in</option><option value="out">Money out</option></select></div>
                    <div><label className="label">Amount (₦)</label><input className="input" type="number" min={0} value={f.amount ?? ''} onChange={e => setF(v => ({ ...v, amount: e.target.value }))} /></div>
                  </>
                )}
                {['receipt', 'payment', 'expense', 'bank', 'credit_note', 'vendor_credit'].includes(form.kind) && (
                  <div className="col-span-2"><label className="label">Notes</label><input className="input" value={f.memo ?? ''} onChange={e => setF(v => ({ ...v, memo: e.target.value }))} /></div>
                )}
                {form.kind === 'journal' && (
                  <>
                    <div><label className="label">Reference #</label><input className="input" value={f.refNo ?? ''} onChange={e => setF(v => ({ ...v, refNo: e.target.value }))} /></div>
                    <div><label className="label">Reverse on (opt.)</label><input className="input" type="date" value={f.reverseDate ?? ''} onChange={e => setF(v => ({ ...v, reverseDate: e.target.value }))} />
                      {f.reverseDate && <p className="text-[10px] text-slate-400 mt-0.5">A mirrored reversal entry publishes on {f.reverseDate}.</p>}</div>
                    <div className="col-span-2"><label className="label">Notes</label><input className="input" value={f.memo ?? ''} onChange={e => setF(v => ({ ...v, memo: e.target.value }))} /></div>
                  </>
                )}
              </div>

              {/* lines */}
              <div className="space-y-2">
                {form.kind === 'journal' ? (
                  <>
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-400 px-1"><span className="col-span-3">Account</span><span className="col-span-3">Description</span><span className="col-span-2">Contact</span><span className="col-span-2">Debits</span><span className="col-span-2">Credits</span></div>
                    {lines.map((l, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 md:col-span-3">{accountPicker(l.accountId, v => setLines(ls => ls.map((x, j) => j === i ? { ...x, accountId: v } : x)))}</div>
                        <input className="input col-span-12 md:col-span-3" placeholder="Description" value={l.memo} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, memo: e.target.value } : x))} />
                        <select className="select col-span-6 md:col-span-2" value={l.contactId ?? ''} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, contactId: e.target.value || undefined } : x))}><option value="">—</option>{finContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <input className="input col-span-3 md:col-span-2" placeholder="Debit (₦)" type="number" min={0} value={l.dr ?? ''} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, dr: e.target.value } : x))} />
                        <div className="col-span-3 md:col-span-2 flex gap-2"><input className="input" placeholder="Credit (₦)" type="number" min={0} value={l.cr ?? ''} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, cr: e.target.value } : x))} />{lines.length > 1 && <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="text-red-400"><Trash2 size={14} /></button>}</div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setLines(ls => [...ls, { accountId: '', amount: '', memo: '' }])} className="btn-secondary text-xs"><Plus size={12} />Add line</button>
                    {(() => {
                      const dr = r2(lines.reduce((s, l) => s + (Number(l.dr) || 0), 0));
                      const cr = r2(lines.reduce((s, l) => s + (Number(l.cr) || 0), 0));
                      const diff = r2(dr - cr);
                      return (
                        <div className="flex justify-end">
                          <div className="w-64 space-y-1 text-xs">
                            <div className="flex justify-between text-slate-600"><span>Sub Total</span><span className="tabular-nums">{fmt(dr)}</span><span className="tabular-nums">{fmt(cr)}</span></div>
                            <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-1"><span>Total (NGN)</span><span className="tabular-nums">{fmt(dr)}</span><span className="tabular-nums">{fmt(cr)}</span></div>
                            <div className={`flex justify-between font-bold ${Math.abs(diff) < 0.005 && dr > 0 ? 'text-emerald-600' : 'text-red-500'}`}><span>Difference</span><span className="tabular-nums">{fmt(Math.abs(diff))}</span><span>{Math.abs(diff) < 0.005 ? (dr > 0 ? '✓' : '') : '⚠ unbalanced'}</span></div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {['invoice', 'quote', 'sales_order', 'bill', 'expense', 'credit_note', 'vendor_credit'].includes(form.kind) && (
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-400 px-1"><span className="col-span-4">Item / account</span><span className="col-span-1">Qty</span><span className="col-span-2">Rate (₦)</span><span className="col-span-1">Disc %</span><span className="col-span-2">Amount (₦)</span><span className="col-span-2">Description</span></div>
                    )}
                    {lines.map((l, i) => {
                      const q = Number(l.qty) || 0, r = Number(l.rate) || 0, dc = Number(l.disc) || 0;
                      const computed = q > 0 && r > 0 ? String(r2(q * r * (1 - dc / 100))) : undefined;
                      const recalc = (qq: number, rr: number, dd: number) => qq > 0 && rr > 0 ? String(r2(qq * rr * (1 - dd / 100))) : undefined;
                      return (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 md:col-span-4 space-y-1">
                          {['invoice', 'quote', 'sales_order', 'credit_note'].includes(form.kind) && finItems.length > 0 && (
                            <select className="select text-xs" value={(l as { itemId?: string }).itemId ?? ''} onChange={e => {
                              const it = finItems.find(i => i.id === e.target.value);
                              setLines(ls => ls.map((x, j) => j === i ? { ...x, itemId: e.target.value, accountId: it?.accountId ?? x.accountId, rate: it ? String(it.price) : x.rate, amount: it ? String(it.price) : x.amount, memo: it?.name ?? x.memo } : x));
                            }}><option value="">From item…</option>{finItems.map(it => <option key={it.id} value={it.id}>{it.name}{it.stock != null ? ` (${it.stock})` : ''}</option>)}</select>
                          )}
                          {accountPicker(l.accountId, v => setLines(ls => ls.map((x, j) => j === i ? { ...x, accountId: v } : x)), ['invoice', 'quote', 'sales_order', 'credit_note'].includes(form.kind) ? ['Income', 'Other Income'] : form.kind === 'depreciation' ? ['Fixed Asset'] : form.kind === 'receipt' ? ['Accounts Receivable', 'Income', 'Other Current Liability'] : ['Expense', 'Cost of Goods Sold', 'Fixed Asset', 'Other Current Asset', 'Accounts Payable', 'Other Current Liability'])}
                        </div>
                        {['invoice', 'quote', 'sales_order', 'bill', 'expense', 'credit_note', 'vendor_credit'].includes(form.kind) ? (
                          <>
                            <input className="input col-span-3 md:col-span-1" type="number" min={0} placeholder="Qty" value={l.qty ?? ''} onChange={e => { const nv = e.target.value; setLines(ls => ls.map((x, j) => { if (j !== i) return x; const a = recalc(Number(nv) || 0, Number(x.rate) || 0, Number(x.disc) || 0); return { ...x, qty: nv, amount: a ?? x.amount }; })) }} />
                            <input className="input col-span-3 md:col-span-2" type="number" min={0} placeholder="Rate" value={l.rate ?? ''} onChange={e => { const nv = e.target.value; setLines(ls => ls.map((x, j) => { if (j !== i) return x; const a = recalc(Number(x.qty) || 0, Number(nv) || 0, Number(x.disc) || 0); return { ...x, rate: nv, amount: a ?? x.amount }; })) }} />
                            <input className="input col-span-3 md:col-span-1" type="number" min={0} max={100} placeholder="Disc %" value={l.disc ?? ''} onChange={e => { const nv = e.target.value; setLines(ls => ls.map((x, j) => { if (j !== i) return x; const a = recalc(Number(x.qty) || 0, Number(x.rate) || 0, Number(nv) || 0); return { ...x, disc: nv, amount: a ?? x.amount }; })) }} />
                            <input className="input col-span-3 md:col-span-2" type="number" min={0} placeholder="Amount" value={computed ?? l.amount} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                          </>
                        ) : (
                          <input className="input col-span-12 md:col-span-5" type="number" min={0} placeholder="Amount (₦)" value={l.amount} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                        )}
                        <div className="col-span-12 md:col-span-2 flex items-center gap-2">
                          <input className="input flex-1" placeholder="Description" value={l.memo} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, memo: e.target.value } : x))} />
                          {lines.length > 1 && <button type="button" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="text-red-400"><Trash2 size={14} /></button>}
                        </div>
                      </div>
                      );
                    })}
                    <button type="button" onClick={() => setLines(ls => [...ls, { accountId: '', amount: '', memo: '' }])} className="btn-secondary text-xs"><Plus size={12} />Add line</button>
                  </>
                )}
              </div>
              {['invoice', 'quote', 'sales_order'].includes(form.kind) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div><label className="label">Customer notes</label><textarea className="input h-16" placeholder="Thanks for your business." value={f.customerNotes ?? ''} onChange={e => setF(v => ({ ...v, customerNotes: e.target.value }))} /></div>
                  <div><label className="label">Terms &amp; conditions</label><textarea className="input h-16" placeholder="Displayed on the document" value={f.termsText ?? ''} onChange={e => setF(v => ({ ...v, termsText: e.target.value }))} /></div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                {['invoice', 'quote', 'sales_order', 'bill'].includes(form.kind) && (
                  <button onClick={() => void submitDoc(true)} disabled={busy} className="btn-secondary">Save as draft</button>
                )}
                {form.kind === 'journal' && (
                  <button onClick={() => {
                    setBusy(true);
                    postJournal({ no: f.no || nextNo(f.fx ? 'FX' : 'MJ', 'journal'), source: f.fx ? 'fx' : 'journal', date: f.date || today(), ref: f.refNo, notes: f.memo, status: 'draft', createdBy: me },
                      lines.map(l => ({ accountId: l.accountId, dr: Number(l.dr) || 0, cr: Number(l.cr) || 0, memo: l.memo, contactId: l.contactId })))
                      .then(() => setForm(null)).catch(reportSaveError).finally(() => setBusy(false));
                  }} disabled={busy} className="btn-secondary">Save as draft</button>
                )}
                <button onClick={() => {
                  if (form.kind === 'journal') {
                    setBusy(true);
                    const jl = lines.map(l => ({ accountId: l.accountId, dr: Number(l.dr) || 0, cr: Number(l.cr) || 0, memo: l.memo, contactId: l.contactId }));
                    const jno = f.no || nextNo(f.fx ? 'FX' : 'MJ', 'journal');
                    postJournal({ no: jno, source: f.fx ? 'fx' : 'journal', date: f.date || today(), ref: f.refNo, notes: f.memo, createdBy: me }, jl)
                      .then(async () => {
                        if (f.reverseDate) {
                          await postJournal({ no: `REV-${jno}`, source: 'journal', date: f.reverseDate, ref: `Reversal of ${jno}`, notes: f.memo, createdBy: me },
                            jl.map(l => ({ accountId: l.accountId, dr: l.cr, cr: l.dr, memo: l.memo ? `Reversal — ${l.memo}` : 'Reversal', contactId: l.contactId })));
                        }
                      })
                      .then(() => setForm(null)).catch(reportSaveError).finally(() => setBusy(false));
                  } else void submitDoc();
                }} disabled={busy || (form.kind === 'journal' && Math.abs(r2(lines.reduce((s, l) => s + (Number(l.dr) || 0), 0)) - r2(lines.reduce((s, l) => s + (Number(l.cr) || 0), 0))) > 0.005)} className="btn-primary">{busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{form.kind === 'journal' ? 'Save and publish' : ['invoice', 'quote', 'sales_order', 'bill'].includes(form.kind) ? 'Save & issue' : `Post ${KIND_LABEL[form.kind]?.toLowerCase()}`}</button>
              </div>
            </div>
          )}

          {(pSub === 'recurring' || pSub === 'recexpenses') && (() => {
            const isExp = pSub === 'recexpenses';
            const recs = finRecurring.filter(r => r.kind === (isExp ? 'expense' : 'invoice'));
            const freqLabel = (fq: string) => fq === 'weekly' ? '/wk' : fq === 'yearly' ? '/yr' : '/mo';
            return (
            <div>
              <h3 className="font-black text-slate-900 mb-2">Recurring {isExp ? 'expenses' : 'invoices'}</h3>
              <p className="text-xs text-slate-500 mb-3">{isExp
                ? 'Expenses you pay periodically (subscriptions, service contracts, retainers) are generated and posted automatically — DR expense / CR paid-through account.'
                : 'Invoices are generated automatically on schedule — posted to the ledger like a normal invoice (DR AR / CR income / CR VAT).'}</p>
              {recForm && (
                <div className="card p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><label className="label">Profile name</label><input className="input" placeholder={isExp ? 'e.g. Office internet subscription' : 'e.g. Monthly management fee'} value={recForm.name} onChange={e => setRecForm(v => v && ({ ...v, name: e.target.value }))} /></div>
                    <div><label className="label">Repeat every</label>
                      <select className="select" value={recForm.frequency} onChange={e => setRecForm(v => v && ({ ...v, frequency: e.target.value as 'weekly' | 'monthly' | 'yearly' }))}>
                        <option value="weekly">Week</option><option value="monthly">Month</option><option value="yearly">Year</option>
                      </select></div>
                    <div><label className="label">Start date</label><input className="input" type="date" value={recForm.nextRun} onChange={e => setRecForm(v => v && ({ ...v, nextRun: e.target.value }))} /></div>
                    <div><label className="label">Ends on</label><input className="input" type="date" value={recForm.endDate ?? ''} onChange={e => setRecForm(v => v && ({ ...v, endDate: e.target.value }))} />
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><input type="checkbox" checked={!recForm.endDate} onChange={e => setRecForm(v => v && ({ ...v, endDate: e.target.checked ? undefined : addDays(v.nextRun, 365) }))} />Never expires</label></div>
                    <div><label className="label">{isExp ? 'Vendor (opt.)' : 'Customer'}</label>
                      <select className="select" value={recForm.contactId} onChange={e => setRecForm(v => v && ({ ...v, contactId: e.target.value }))}>
                        <option value="">Choose…</option>
                        {finContacts.filter(c => isExp ? (c.type === 'vendor' || c.type === 'both') : (c.type === 'customer' || c.type === 'both')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select></div>
                    {isExp && (
                      <div><label className="label">Paid through</label>
                        <select className="select" value={recForm.paidThroughId} onChange={e => setRecForm(v => v && ({ ...v, paidThroughId: e.target.value }))}>
                          {finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                        </select></div>
                    )}
                    <div><label className="label">VAT (₦)</label><input className="input" type="number" min={0} value={recForm.vat} onChange={e => setRecForm(v => v && ({ ...v, vat: e.target.value }))} /></div>
                    <div className="col-span-2"><label className="label">Notes</label><input className="input" value={recForm.memo} onChange={e => setRecForm(v => v && ({ ...v, memo: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2">
                    {recLines.map((l, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">{accountPicker(l.accountId, v => setRecLines(ls => ls.map((x, j) => j === i ? { ...x, accountId: v } : x)), isExp ? ['Expense', 'Cost of Goods Sold', 'Other Expense'] : ['Income', 'Other Income'])}</div>
                        <div className="col-span-3"><input className="input" type="number" min={0} placeholder="Amount" value={l.amount} onChange={e => setRecLines(ls => ls.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} /></div>
                        <div className="col-span-3"><input className="input" placeholder="Memo" value={l.memo} onChange={e => setRecLines(ls => ls.map((x, j) => j === i ? { ...x, memo: e.target.value } : x))} /></div>
                        <div className="col-span-1"><button className="btn-ghost text-red-500" onClick={() => setRecLines(ls => ls.filter((_, j) => j !== i))}><Trash2 size={14} /></button></div>
                      </div>
                    ))}
                    <button className="btn-secondary text-xs" onClick={() => setRecLines(ls => [...ls, { accountId: '', amount: '', memo: '' }])}><Plus size={12} />Add line</button>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary" disabled={busy} onClick={async () => {
                      const lns = recLines.filter(l => l.accountId && Number(l.amount) > 0).map(l => ({ accountId: l.accountId, amount: Number(l.amount), memo: l.memo || undefined }));
                      if ((!isExp && !recForm.contactId) || !lns.length) return alert(isExp ? 'Add at least one expense line with an account and amount.' : 'Pick a customer and at least one line with an account and amount.');
                      if (isExp && !recForm.paidThroughId) return alert('Pick the account the expense is paid through.');
                      setBusy(true);
                      try {
                        await upsertFinRecurring({ kind: recForm.kind, name: recForm.name || undefined, contactId: recForm.contactId || undefined, lines: lns, vat: Number(recForm.vat || 0), frequency: recForm.frequency, paidThroughId: recForm.paidThroughId || undefined, dayOfMonth: new Date(recForm.nextRun).getDate(), nextRun: recForm.nextRun, endDate: recForm.endDate || undefined, memo: recForm.memo || undefined, createdBy: me });
                        await logFinActivity(me, `Created recurring ${recForm.kind} ${recForm.name || ''} for ${recForm.contactId ? contactName(recForm.contactId) : 'general spend'}`);
                        setRecForm(null); setRecLines([{ accountId: '', amount: '', memo: '' }]);
                      } catch (e) { reportSaveError(e); } finally { setBusy(false); }
                    }}>{busy ? <Loader2 className="animate-spin" size={14} /> : 'Save profile'}</button>
                    <button className="btn-ghost" onClick={() => setRecForm(null)}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="card divide-y divide-slate-100">
                {recs.map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                    <div className="flex-1"><span className="font-semibold">{r.name || contactName(r.contactId)}</span>{r.name && r.contactId && <span className="text-xs text-slate-400 ml-2">· {contactName(r.contactId)}</span>}</div>
                    <span className="text-xs text-slate-400">{r.lines.length} line{r.lines.length !== 1 ? 's' : ''} · {fmt(r.lines.reduce((s, l) => s + l.amount, 0) + r.vat)}{freqLabel(r.frequency)}</span>
                    <span className="text-xs text-slate-500">next {r.nextRun}{r.endDate ? ` · ends ${r.endDate}` : ''}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{r.active ? 'active' : 'paused'}</span>
                    <button className="btn-ghost text-xs" onClick={async () => { try { await upsertFinRecurring({ ...r, active: !r.active }); } catch (e) { reportSaveError(e); } }}>{r.active ? 'Pause' : 'Resume'}</button>
                    <button className="btn-ghost text-red-500" onClick={async () => { if (confirm('Delete this recurring profile?')) { try { await deleteFinRecurring(r.id); } catch (e) { reportSaveError(e); } } }}><Trash2 size={14} /></button>
                  </div>
                ))}
                {recs.length === 0 && <p className="p-8 text-center text-sm text-slate-400">{isExp ? 'No recurring expenses yet — e.g. subscriptions, service contracts, retainers.' : 'No recurring invoices yet — e.g. monthly facility management fees.'}</p>}
              </div>
            </div>
            );
          })()}

          {tab === 'journals' && (
            <div>
              <h3 className="font-black text-slate-900 mb-2">Journal entries</h3>
              <p className="text-xs text-slate-500 mb-3">Every balanced double-entry in the books — manual journals, FX adjustments, and the auto-posted entries behind each document.</p>
              <div className="card divide-y divide-slate-100">
                {finJournalEntries.map(e => {
                  const ls = finJournalLines.filter(l => l.entryId === e.id);
                  const tot = r2(ls.reduce((s, l) => s + l.debit, 0));
                  const srcDoc = finDocuments.find(d => d.id === e.sourceId);
                  const standalone = !e.sourceId || !srcDoc;
                  return (
                    <div key={e.id} className="px-4 py-3">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-mono text-xs font-bold text-slate-500 w-24 flex-shrink-0">{e.no}</span>
                        <span className="text-xs text-slate-400 w-20 flex-shrink-0">{e.date}</span>
                        <span className={`badge ${e.source === 'journal' ? 'bg-violet-100 text-violet-700' : e.source === 'fx' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{e.source}</span>
                        <span className="flex-1 font-semibold text-slate-700 truncate">{e.ref ?? e.notes ?? (srcDoc ? `${KIND_LABEL[srcDoc.kind]} ${srcDoc.no}` : '—')}</span>
                        <span className="font-bold text-slate-900 tabular-nums">{fmt(tot)}</span>
                        <span className={`badge ${STATUS_COLORS[e.status] ?? 'bg-slate-100 text-slate-500'}`}>{e.status}</span>
                        <button onClick={() => setExpandId(exp => exp === e.id ? null : e.id)} className="text-[11px] font-semibold text-brand-600 whitespace-nowrap">Lines</button>
                        {e.status === 'draft' && (
                          <button onClick={async () => { try { await publishFinJournalEntry(e.id, e.no, me); } catch (err) { reportSaveError(err); } }} className="text-[11px] font-bold text-emerald-600 whitespace-nowrap">Publish</button>
                        )}
                        {standalone && e.status !== 'void' && (
                          <button onClick={async () => { if (confirm(`Void journal ${e.no}?`)) { try { await voidFinJournalEntry(e.id, e.no, me); } catch (err) { reportSaveError(err); } } }} className="text-[11px] text-red-500 font-semibold">Void</button>
                        )}
                      </div>
                      {expandId === e.id && (
                        <div className="mt-2 ml-28 mr-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
                          <table className="w-full text-xs"><tbody>
                            {ls.map(l => <tr key={l.id}><td className="py-1">{accName(l.accountId)}</td><td className="text-slate-400">{l.memo ?? ''}{l.contactId ? ` · ${contactName(l.contactId)}` : ''}</td><td className="text-right tabular-nums">{l.debit ? `DR ${fmt(l.debit)}` : ''}</td><td className="text-right tabular-nums">{l.credit ? `CR ${fmt(l.credit)}` : ''}</td></tr>)}
                          </tbody></table>
                          {e.ref && <p className="text-[10px] text-slate-400 mt-2">Ref: {e.ref}</p>}
                          {srcDoc && <p className="text-[10px] text-slate-400 mt-2">Source document: {KIND_LABEL[srcDoc.kind]} {srcDoc.no}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {finJournalEntries.length === 0 && (
                  <Landing title="Directly adjust your books." blurb="Manual journals record adjustments no document covers — opening balances, accruals, corrections. Every entry must balance debits against credits before it publishes." cta="New manual journal" onCta={() => openForm('journal')} steps={['Draft journal', 'Balance debits = credits', 'Publish', 'Reports update']} />
                )}
              </div>
            </div>
          )}

          {(() => {
            if (pSub === 'recurring' || pSub === 'recexpenses' || tab === 'journals') return null;
            const SUB: Record<string, string[]> = { quotes: ['quote'], sorders: ['sales_order'], invoices: ['invoice'], receipts: ['receipt'], cnotes: ['credit_note'], bills: ['bill'], payments: ['payment'], expenses: ['expense'], vcredits: ['vendor_credit'] };
            const TITLE: Record<string, string> = { quotes: 'Quotes', sorders: 'Sales orders', invoices: 'Invoices', receipts: 'Receipts', cnotes: 'Credit notes', bills: 'Bills', payments: 'Payments made', expenses: 'Expenses', vcredits: 'Vendor credits' };
            const kinds = SUB[pSub] ?? (tab === 'sales' ? ['quote', 'sales_order', 'invoice', 'receipt', 'credit_note'] : tab === 'purchases' ? ['bill', 'payment', 'expense', 'vendor_credit'] : tab === 'banking' ? ['bank'] : ['journal']);
            const docs = openDocs(kinds as FinDocKind[]);
            return (
              <div>
                {TITLE[pSub] && <h3 className="font-black text-slate-900 mb-2">{TITLE[pSub]}</h3>}
                {docs.length === 0 && LANDING[pSub] ? (
                  <Landing {...LANDING[pSub]} onCta={() => openForm(LANDING[pSub].kind)} />
                ) : (
                  <div className="card divide-y divide-slate-100">
                    {docs.map(docRow)}
                    {docs.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Nothing posted yet.</p>}
                  </div>
                )}
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
            {([['tb', 'Trial balance'], ['pl', 'Profit & loss'], ['bs', 'Balance sheet'], ['acct', 'Account transactions'], ['ar', 'Receivables aging'], ['ap', 'Payables aging'], ['cf', 'Cash flow'], ['ratios', 'Ratios & equity'], ['tax', 'VAT & WHT summary'], ['budget', 'Budget vs actual']] as const).map(([id, label]) => (
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

          {/* ---- Receivables / Payables aging ---- */}
          {tab === 'reports' && (['ar', 'ap'] as const).includes(report as 'ar' | 'ap') && (() => {
            const kind = report === 'ar' ? 'invoice' : 'bill';
            const buckets = [0, 30, 60, 90];
            const rows = finDocuments.filter(d => d.kind === kind && ['issued', 'part_paid'].includes(d.status)).map(d => {
              const out = r2(d.total - d.paid);
              const age = Math.max(0, Math.floor((Date.now() - new Date(d.dueDate ?? d.date).getTime()) / 86400000));
              return { d, out, bucket: age <= 0 ? 0 : age <= 30 ? 30 : age <= 60 ? 60 : 90 };
            }).filter(r => r.out > 0.005);
            return (
              <div className="card p-5">
                <h2 className="font-black text-slate-900 mb-3">{report === 'ar' ? 'Receivables' : 'Payables'} aging</h2>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100"><th className="py-2">{report === 'ar' ? 'Customer' : 'Vendor'}</th><th>{report === 'ar' ? 'Invoice' : 'Bill'}</th><th>Due</th><th className="text-right">Current</th><th className="text-right">1–30d</th><th className="text-right">31–60d</th><th className="text-right">60d+</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(({ d, out, bucket }) => (
                      <tr key={d.id}><td className="py-1.5 font-semibold">{contactName(d.contactId)}</td><td className="font-mono text-xs">{d.no}</td><td className="text-xs text-slate-400">{d.dueDate ?? d.date}</td>
                        {buckets.map(b => <td key={b} className="text-right tabular-nums">{bucket === b ? fmt(out) : ''}</td>)}
                      </tr>
                    ))}
                    <tr className="font-black border-t-2 border-slate-200"><td colSpan={3} className="py-2">Total outstanding</td><td colSpan={4} className="text-right tabular-nums">{fmt(rows.reduce((s, r) => s + r.out, 0))}</td></tr>
                  </tbody>
                </table>
                {rows.length === 0 && <p className="text-sm text-slate-400 py-4">No open {report === 'ar' ? 'invoices' : 'bills'}.</p>}
              </div>
            );
          })()}

          {/* ---- Cash flow ---- */}
          {tab === 'reports' && report === 'cf' && (() => {
            const cashIds = new Set(finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).map(a => a.id));
            let inflow = 0, outflow = 0;
            const bySource: Record<string, { in: number; out: number }> = {};
            finJournalEntries.filter(e => e.status === 'published').forEach(e => {
              finJournalLines.filter(l => l.entryId === e.id && cashIds.has(l.accountId)).forEach(l => {
                const s = bySource[e.source] ?? (bySource[e.source] = { in: 0, out: 0 });
                s.in += l.debit; s.out += l.credit; inflow += l.debit; outflow += l.credit;
              });
            });
            const label: Record<string, string> = { receipt: 'Receipts', invoice: 'Invoices', payment: 'Payments made', expense: 'Expenses', bank: 'Bank transactions', bill: 'Bills', journal: 'Journals', fx: 'FX adjustments' };
            return (
              <div className="card p-5">
                <h2 className="font-black text-slate-900 mb-3">Cash flow</h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50"><p className="text-[11px] font-bold uppercase text-emerald-700">Money in</p><p className="text-lg font-black text-emerald-700">{fmt(inflow)}</p></div>
                  <div className="p-3 rounded-xl bg-red-50"><p className="text-[11px] font-bold uppercase text-red-600">Money out</p><p className="text-lg font-black text-red-600">{fmt(outflow)}</p></div>
                  <div className="p-3 rounded-xl bg-slate-50"><p className="text-[11px] font-bold uppercase text-slate-500">Net movement</p><p className={`text-lg font-black ${inflow - outflow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(inflow - outflow)}</p></div>
                </div>
                <table className="w-full text-sm"><tbody className="divide-y divide-slate-50">
                  {Object.entries(bySource).map(([src, v]) => (
                    <tr key={src}><td className="py-1.5 font-semibold">{label[src] ?? src}</td><td className="text-right tabular-nums text-emerald-700">{v.in ? `+${fmt(v.in)}` : ''}</td><td className="text-right tabular-nums text-red-600">{v.out ? `−${fmt(v.out)}` : ''}</td></tr>
                  ))}
                </tbody></table>
              </div>
            );
          })()}

          {/* ---- Ratios & equity ---- */}
          {tab === 'reports' && report === 'ratios' && (() => {
            const ca = finAccounts.filter(a => ['Cash', 'Bank', 'Accounts Receivable', 'Other Current Asset'].includes(a.type)).reduce((s, a) => s + natural(a), 0);
            const cl = finAccounts.filter(a => ['Accounts Payable', 'Other Current Liability'].includes(a.type)).reduce((s, a) => s + natural(a), 0);
            const eq = finAccounts.filter(a => a.type === 'Equity').reduce((s, a) => s + natural(a), 0) + pl.net;
            const debt = finAccounts.filter(a => ['Accounts Payable', 'Other Current Liability', 'Long Term Liability'].includes(a.type)).reduce((s, a) => s + natural(a), 0);
            const rows: [string, string, string][] = [
              ['Current ratio', 'Current assets / current liabilities', cl ? (ca / cl).toFixed(2) : '—'],
              ['Working capital', 'Current assets − current liabilities', fmt(ca - cl)],
              ['Net margin', 'Net result / total income', pl.inc ? `${((pl.net / pl.inc) * 100).toFixed(1)}%` : '—'],
              ['Debt to equity', 'Liabilities / equity', eq ? (debt / eq).toFixed(2) : '—'],
              ['Equity position', 'Equity accounts + retained result', fmt(eq)],
              ['Receivable days', 'AR / income × 365', pl.inc ? `${Math.round((bal(acct('1200')!) / pl.inc) * 365)} days` : '—'],
            ];
            return (
              <div className="card p-5">
                <h2 className="font-black text-slate-900 mb-3">Ratios &amp; equity</h2>
                <div className="divide-y divide-slate-100">{rows.map(([name, desc, v]) => (
                  <div key={name} className="py-2.5 flex items-center gap-4"><div className="flex-1"><p className="font-bold text-sm text-slate-800">{name}</p><p className="text-xs text-slate-400">{desc}</p></div><p className="font-black tabular-nums">{v}</p></div>
                ))}</div>
              </div>
            );
          })()}

          {/* ---- VAT & WHT summary ---- */}
          {tab === 'reports' && report === 'tax' && (() => {
            const taxIds = new Set(['acc_2100', 'acc_2110', 'acc_2120']);
            const rows = finAccounts.filter(a => taxIds.has(a.id) || /vat|wht|tax/i.test(a.name));
            const moved = new Set(finJournalLines.filter(l => rows.some(a => a.id === l.accountId)).map(l => l.accountId));
            return (
              <div className="card p-5">
                <h2 className="font-black text-slate-900 mb-3">VAT &amp; WHT summary</h2>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100"><th className="py-2">Tax account</th><th className="text-right">Balance (owed)</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.filter(a => moved.has(a.id) || bal(a.id) !== 0).map(a => (
                      <tr key={a.id}><td className="py-1.5 font-semibold">{a.code} · {a.name}</td><td className="text-right tabular-nums">{fmt(-bal(a.id))}</td></tr>
                    ))}
                    <tr className="font-black border-t-2 border-slate-200"><td className="py-2">Total tax position</td><td className="text-right tabular-nums">{fmt(-rows.reduce((s, a) => s + bal(a.id), 0))}</td></tr>
                  </tbody>
                </table>
                {rows.length === 0 && <p className="text-sm text-slate-400 py-4">No tax accounts posted to yet — VAT on invoices lands in 2100, WHT withholding in 2110.</p>}
              </div>
            );
          })()}

          {tab === 'reports' && report === 'budget' && (
            <div className="space-y-4">
              <div className="card p-5 space-y-3">
                <h2 className="font-black text-slate-900">New budget</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input className="input" placeholder="Budget name" value={budName} onChange={e => setBudName(e.target.value)} />
                  <select className="select" value={budPeriod} onChange={e => setBudPeriod(e.target.value)}>
                    {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(y => <option key={y} value={String(y)}>Jan {y} – Dec {y}</option>)}
                  </select>
                  <select className="select" value={budFreq} onChange={e => setBudFreq(e.target.value as 'monthly' | 'quarterly' | 'yearly')}>
                    <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                  </select>
                  <p className="text-[11px] text-slate-400 self-center">Amounts below are per {budFreq === 'monthly' ? 'month' : budFreq === 'quarterly' ? 'quarter' : 'year'} — across income, expense, and balance-sheet accounts.</p>
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
                    try { await upsertFinBudget({ name: budName.trim(), period: budPeriod.trim(), budgetPeriod: budFreq, lines: ls }); setBudName(''); setBudLines([{ accountId: '', amount: '' }]); } catch (e) { reportSaveError(e); }
                  }} className="btn-primary text-xs">Save budget</button>
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-black text-slate-900">Budget vs actual</h2>
                  <select className="select max-w-xs" value={budId} onChange={e => setBudId(e.target.value)}><option value="">Pick a budget…</option>{finBudgets.map(b => <option key={b.id} value={b.id}>{b.name} ({b.period}{b.budgetPeriod ? ` · ${b.budgetPeriod}` : ''})</option>)}</select>
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

      {tab === 'connect' && <FinConnect />}
      {tab === 'import' && <FinImport />}

      {/* ---------- TRANSACTION LOCKING + BULK UPDATE ---------- */}
      {tab === 'lock' && (() => {
        const lock = finDocuments.filter(d => d.kind === 'lock').sort((a, b) => b.date.localeCompare(a.date))[0];
        const lockUntil = (lock?.payload.date as string | undefined) ?? null;
        return (
          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              <h2 className="font-black text-slate-900">Transaction locking</h2>
              <p className="text-xs text-slate-500">Blocks creating, editing or voiding entries dated on or before the lock date — use after closing a period.</p>
              {lockUntil ? (
                <div className="flex items-center gap-3">
                  <span className="badge bg-amber-100 text-amber-800">Locked through {lockUntil}</span>
                  <button onClick={async () => { if (confirm('Remove the lock? Entries in the closed period become editable again.')) { try { await updateFinDocument(lock.id, { status: 'void' }); } catch (e) { reportSaveError(e); } } }} className="btn-secondary text-xs">Unlock</button>
                </div>
              ) : <p className="text-sm text-slate-400">No active lock.</p>}
              <div className="flex gap-2 items-end">
                <div><label className="label">Lock entries on or before</label><input className="input w-40" type="date" value={lockDate} onChange={e => setLockDate(e.target.value)} /></div>
                <button onClick={async () => {
                  if (!lockDate) return;
                  try { await createFinDocument({ kind: 'lock', no: `LOCK-${lockDate}`, date: lockDate, status: 'issued', total: 0, paid: 0, createdBy: me, payload: { date: lockDate } }); setLockDate(''); } catch (e) { reportSaveError(e); }
                }} className="btn-primary text-xs">Set lock</button>
              </div>
            </div>

            <div className="card p-5 space-y-3">
              <h2 className="font-black text-slate-900">Bulk update — reclassify postings</h2>
              <p className="text-xs text-slate-500">Moves every published posting from one account to another. Changes what every report shows for those transactions.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div><label className="label">From account</label>{accountPicker(bulk.from, v => setBulk(b => ({ ...b, from: v })))}</div>
                <div><label className="label">To account</label>{accountPicker(bulk.to, v => setBulk(b => ({ ...b, to: v })))}</div>
                <button onClick={async () => {
                  if (!bulk.from || !bulk.to || bulk.from === bulk.to) return alert('Pick two different accounts.');
                  const n = finJournalLines.filter(l => l.accountId === bulk.from).length;
                  if (!confirm(`Move ${n} posting(s) from "${accName(bulk.from)}" to "${accName(bulk.to)}"?`)) return;
                  try { await reclassifyFinLines(bulk.from, bulk.to); await logFinActivity(me, `Bulk-moved ${n} postings: ${accName(bulk.from)} → ${accName(bulk.to)}`); setBulk({ from: '', to: '' }); } catch (e) { reportSaveError(e); }
                }} className="btn-primary text-xs">Move postings</button>
              </div>
            </div>
          </div>
        );
      })()}

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
