import { useMemo, useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { createFinContact, upsertFinItem, postJournal, upsertFinAccount, type PostLine } from '../../lib/db';
import type { FinAccountType, FinDocument } from '../../types';
import { Download } from 'lucide-react';

/* ---------- CSV parser (handles quoted fields, embedded commas/newlines) ---------- */
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (field !== '' || cur.length) { cur.push(field); field = ''; if (cur.some(v => v !== '')) rows.push(cur); cur = []; } }
    else field += c;
  }
  if (field !== '' || cur.length) { cur.push(field); if (cur.some(v => v !== '')) rows.push(cur); }
  return { headers: rows[0] ?? [], rows: rows.slice(1) };
}

type ImportType = 'accounts' | 'contacts' | 'items' | 'journals';

// Auto-detect common Zoho Books header names → our canonical field
const FIELD_ALIASES: Record<string, string[]> = {
  code: ['account code', 'code'], name: ['account name', 'contact name', 'customer name', 'vendor name', 'name', 'item name', 'display name'],
  type: ['account type', 'contact type', 'type'], email: ['email address', 'email', 'emailid'],
  phone: ['phone', 'work phone', 'mobile'], desc: ['description', 'notes'],
  price: ['rate', 'price', 'sales rate', 'selling price'],
  date: ['journal date', 'date', 'transaction date'], no: ['journal number', 'reference number', 'entry number'],
  account: ['account', 'account name and code', 'account code'], dr: ['debit', 'dr'], cr: ['credit', 'cr'],
  memo: ['memo', 'line description', 'description'],
  ref: ['reference number', 'reference'],
};

const TYPE_FIELDS: Record<ImportType, { key: string; label: string; required?: boolean }[]> = {
  accounts: [{ key: 'code', label: 'Account code', required: true }, { key: 'name', label: 'Account name', required: true }, { key: 'type', label: 'Account type' }],
  contacts: [{ key: 'name', label: 'Contact name', required: true }, { key: 'type', label: 'Type' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }],
  items: [{ key: 'name', label: 'Item name', required: true }, { key: 'desc', label: 'Description' }, { key: 'price', label: 'Rate (₦)' }, { key: 'account', label: 'Income account' }],
  journals: [{ key: 'date', label: 'Journal date', required: true }, { key: 'no', label: 'Journal number', required: true }, { key: 'account', label: 'Account', required: true }, { key: 'dr', label: 'Debit' }, { key: 'cr', label: 'Credit' }, { key: 'memo', label: 'Description' }, { key: 'ref', label: 'Reference' }],
};

const guessType = (t: string): ImportType => {
  const s = t.toLowerCase();
  if (s.includes('journal') || s.includes('entries')) return 'journals';
  if (s.includes('account')) return 'accounts';
  if (s.includes('item')) return 'items';
  return 'contacts';
};

function downloadCsv(name: string, headers: string[], rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export default function FinImport() {
  const { finAccounts, finJournalEntries, finJournalLines, finDocuments, currentUser } = useStore();
  const [bankMatch, setBankMatch] = useState<{ amt: number; date: string; ref: string; matched: boolean }[] | null>(null);
  const me = currentUser?.name ?? 'Finance';
  const [type, setType] = useState<ImportType>('contacts');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({});
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ok: number; skipped: number; errors: string[] } | null>(null);

  const fieldIdx = (key: string) => map[key];

  const loadFile = async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseCsv(text.replace(/^\uFEFF/, ''));
    if (!headers.length || !rows.length) return alert('Could not read any rows — is this a CSV export?');
    setHeaders(headers); setRows(rows); setFileName(file.name); setDone(null);
    setType(guessType(file.name));
    // auto-map headers to canonical fields via aliases
    const m: Record<string, number> = {};
    headers.forEach((h, i) => {
      const norm = h.trim().toLowerCase();
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) if (aliases.includes(norm) && !(field in m)) m[field] = i;
    });
    setMap(m);
  };

  const val = (row: string[], key: string) => (fieldIdx(key) !== undefined ? (row[fieldIdx(key)] ?? '').trim() : '');

  const accountByName = useMemo(() => {
    const m = new Map<string, string>();
    finAccounts.forEach(a => { m.set(a.name.toLowerCase(), a.id); m.set(`${a.code} ${a.name}`.toLowerCase(), a.id); m.set(a.code, a.id); });
    return m;
  }, [finAccounts]);
  const matchAccount = (raw: string) => {
    const s = raw.trim().toLowerCase();
    if (!s) return undefined;
    return accountByName.get(s) ?? accountByName.get(s.replace(/^0+/, '')) ?? [...accountByName.entries()].find(([k]) => k.includes(s) || s.includes(k))?.[1];
  };

  const run = async () => {
    const missing = TYPE_FIELDS[type].filter(f => f.required && fieldIdx(f.key) === undefined);
    if (missing.length) return alert(`Map required columns first: ${missing.map(f => f.label).join(', ')}`);
    setBusy(true); setDone(null);
    let ok = 0, skipped = 0; const errors: string[] = [];
    try {
      if (type === 'accounts') {
        for (const r of rows) {
          try { await upsertFinAccount({ code: val(r, 'code'), name: val(r, 'name'), type: (val(r, 'type') || 'Expense') as FinAccountType }); ok++; }
          catch (e) { skipped++; errors.push(`${val(r, 'name')}: ${(e as Error).message}`); }
        }
      } else if (type === 'contacts') {
        for (const r of rows) {
          try { await createFinContact({ name: val(r, 'name'), type: (['vendor', 'both'].includes(val(r, 'type').toLowerCase()) ? val(r, 'type').toLowerCase() : 'customer') as 'customer' | 'vendor' | 'both', email: val(r, 'email') || undefined, phone: val(r, 'phone') || undefined }); ok++; }
          catch (e) { skipped++; errors.push(`${val(r, 'name')}: ${(e as Error).message}`); }
        }
      } else if (type === 'items') {
        for (const r of rows) {
          try { await upsertFinItem({ name: val(r, 'name'), description: val(r, 'desc') || undefined, price: Number(val(r, 'price').replace(/[^\d.]/g, '')) || 0, accountId: matchAccount(val(r, 'account')) }); ok++; }
          catch (e) { skipped++; errors.push(`${val(r, 'name')}: ${(e as Error).message}`); }
        }
      } else {
        // group rows by journal number → one balanced entry per number
        const groups = new Map<string, string[][]>();
        rows.forEach(r => { const k = val(r, 'no') || `${val(r, 'date')}_${r.join('|')}`; groups.set(k, [...(groups.get(k) ?? []), r]); });
        for (const [no, gRows] of groups) {
          const lines: PostLine[] = []; let unmapped = 0;
          for (const r of gRows) {
            const aId = matchAccount(val(r, 'account'));
            const dr = Number(val(r, 'dr').replace(/[^\d.]/g, '')) || 0, cr = Number(val(r, 'cr').replace(/[^\d.]/g, '')) || 0;
            if (!aId) { unmapped++; continue; }
            lines.push({ accountId: aId, dr, cr, memo: val(r, 'memo') || undefined });
          }
          if (!lines.length) { skipped++; errors.push(`${no}: no rows matched chart of accounts`); continue; }
          try {
            await postJournal({ no, source: 'journal', date: val(gRows[0], 'date') || new Date().toISOString().slice(0, 10), ref: val(gRows[0], 'ref') || undefined, createdBy: me }, lines);
            ok++;
            if (unmapped) errors.push(`${no}: ${unmapped} line(s) skipped — account not in chart`);
          } catch (e) { skipped++; errors.push(`${no}: ${(e as Error).message}`); }
        }
      }
      setDone({ ok, skipped, errors });
    } finally { setBusy(false); }
  };

  const requiredDone = TYPE_FIELDS[type].every(f => !f.required || fieldIdx(f.key) !== undefined);

  const accLabel = (id: string) => { const a = finAccounts.find(x => x.id === id); return a ? `${a.code} ${a.name}` : id; };
  const exportJournals = () => {
    const pub = finJournalEntries.filter(e => e.status !== 'void');
    const rows: (string | number | undefined)[][] = [];
    pub.forEach(e => finJournalLines.filter(l => l.entryId === e.id).forEach(l =>
      rows.push([e.date, e.no, accLabel(l.accountId), l.debit || '', l.credit || '', l.memo ?? e.notes ?? '', e.ref ?? '', e.source])));
    downloadCsv(`journals-${new Date().toISOString().slice(0, 10)}.csv`, ['Journal Date', 'Journal Number', 'Account', 'Debit', 'Credit', 'Description', 'Reference Number', 'Source'], rows);
  };
  const exportDocs = () => {
    downloadCsv(`documents-${new Date().toISOString().slice(0, 10)}.csv`, ['Date', 'Number', 'Type', 'Contact', 'Status', 'Total', 'Paid', 'Due Date'],
      finDocuments.map((d: FinDocument) => [d.date, d.no, d.kind, d.contactId ?? '', d.status, d.total, d.paid, d.dueDate ?? '']));
  };
  const exportTrialBalance = () => {
    const net = new Map<string, number>();
    finJournalEntries.filter(e => e.status === 'published').forEach(e =>
      finJournalLines.filter(l => l.entryId === e.id).forEach(l => net.set(l.accountId, (net.get(l.accountId) ?? 0) + l.debit - l.credit)));
    downloadCsv(`trial-balance-${new Date().toISOString().slice(0, 10)}.csv`, ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit'],
      finAccounts.filter(a => net.get(a.id)).map(a => [a.code, a.name, a.type, net.get(a.id)! > 0 ? net.get(a.id) : '', net.get(a.id)! < 0 ? -net.get(a.id)! : '']));
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div>
          <h2 className="font-black text-slate-900">Import from Zoho Books (CSV)</h2>
          <p className="text-xs text-slate-500 mt-1">Export from Zoho Books → Settings → Import/Export (or module → ⋮ → Export as CSV). Upload the CSV here — data writes straight into the ledger, no manual re-entry.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div><label className="label">Import type</label>
            <select className="select" value={type} onChange={e => setType(e.target.value as ImportType)}>
              <option value="journals">Journal entries (full history)</option>
              <option value="accounts">Chart of accounts</option>
              <option value="contacts">Contacts</option>
              <option value="items">Items / services</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="label">CSV file</label>
            <label className="btn-secondary w-full justify-center cursor-pointer">
              <FileUp size={14} />{fileName || 'Choose CSV…'}
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files?.[0] && void loadFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <p className="text-[11px] font-bold uppercase text-slate-400">Column mapping — {rows.length} rows in {fileName}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TYPE_FIELDS[type].map(f => (
                  <div key={f.key}>
                    <label className="label">{f.label}{f.required ? ' *' : ''}</label>
                    <select className="select" value={fieldIdx(f.key) ?? ''} onChange={e => setMap(m => ({ ...m, [f.key]: e.target.value === '' ? -1 : Number(e.target.value) }))}>
                      <option value="">— skip —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {type === 'journals' && <p className="text-[11px] text-slate-400">Rows sharing a journal number post as one balanced entry. Accounts are matched by name or code — unmatched rows are skipped and reported.</p>}
            </div>

            <div className="card overflow-hidden">
              <p className="px-4 py-2 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100">Preview (first 8 rows)</p>
              <div className="overflow-x-auto"><table className="w-full text-xs"><tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">{TYPE_FIELDS[type].map(f => <td key={f.key} className="px-3 py-1.5 text-slate-600 whitespace-nowrap max-w-52 truncate">{val(r, f.key)}</td>)}{type === 'journals' && <td className="px-3 py-1.5">{matchAccount(val(r, 'account')) ? <CheckCircle2 size={12} className="text-emerald-500" /> : <AlertCircle size={12} className="text-amber-500" />}</td>}</tr>
                ))}
              </tbody></table></div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => void run()} disabled={busy || !requiredDone} className="btn-primary">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Import {type === 'journals' ? 'journal entries' : type}
              </button>
              {!requiredDone && <span className="text-xs text-amber-600">Map all * required columns to continue.</span>}
            </div>
          </>
        )}

        {done && (
          <div className={`p-4 rounded-xl border ${done.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="font-bold text-sm">{done.ok} imported · {done.skipped} skipped</p>
            {done.errors.length > 0 && <ul className="text-xs mt-1 space-y-0.5 text-slate-600 max-h-40 overflow-y-auto">{done.errors.slice(0, 30).map((e, i) => <li key={i}>• {e}</li>)}</ul>}
          </div>
        )}
      </div>

      <div className="card p-4 text-xs text-slate-500 space-y-1">
        <p className="font-bold text-slate-700">Zoho export tips</p>
        <p>• Journal entries: <em>Reports → Journal Report → Export as CSV</em> — brings the complete historical ledger across in one import.</p>
        <p>• Chart of accounts: <em>Accountant → Chart of Accounts → ⋮ → Export</em> — run this <b>first</b> so journal accounts match.</p>
        <p>• Contacts/items: export from their module lists. Duplicates are skipped by name/code conflicts and reported.</p>
      </div>

      {/* ---------- BANK STATEMENT MATCHING ---------- */}
      <div className="card p-5 space-y-3">
        <h2 className="font-black text-slate-900">Match a bank statement</h2>
        <p className="text-xs text-slate-500">Upload the bank's CSV export — each row is matched against entries posted to your bank/cash accounts by amount and date.</p>
        <input type="file" accept=".csv,text/csv" className="input" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          const { headers, rows } = parseCsv(await file.text());
          const hLower = headers.map(h => h.toLowerCase());
          const ai = hLower.findIndex(h => /amount|credit|debit|value/.test(h));
          const di = hLower.findIndex(h => /date/.test(h));
          const ni = hLower.findIndex(h => /descr|narrat|particular|ref/.test(h));
          const bankIds = new Set(finAccounts.filter(a => ['Cash', 'Bank'].includes(a.type)).map(a => a.id));
          const ledger = finJournalLines.filter(l => bankIds.has(l.accountId));
          const res = rows.map(r => {
            const amt = Number((r[ai] ?? '0').replace(/[^0-9.-]/g, ''));
            const date = r[di] ?? '';
            const ref = r[ni] ?? '';
            const hit = ledger.find(l => {
              const e = finJournalEntries.find(x => x.id === l.entryId);
              return e && Math.abs((l.debit || l.credit) - Math.abs(amt)) < 0.01 && (!date || e.date === date);
            });
            return { amt, date, ref, matched: !!hit };
          });
          setBankMatch(res);
        }} />
        {bankMatch && (
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1">{bankMatch.filter(r => r.matched).length} matched · {bankMatch.filter(r => !r.matched).length} unmatched</p>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-lg">
              {bankMatch.map((r, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center gap-3 text-xs">
                  <span className={r.matched ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{r.matched ? '✓ matched' : '⚠ unmatched'}</span>
                  <span className="text-slate-400">{r.date}</span>
                  <span className="flex-1 text-slate-600 truncate">{r.ref}</span>
                  <span className="font-bold tabular-nums">₦{r.amt.toLocaleString('en-NG')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- EXPORT ---------- */}
      <div className="card p-5 space-y-3">
        <h2 className="font-black text-slate-900">Export CSV</h2>
        <p className="text-xs text-slate-500">Download the ledger or documents as CSV — same shapes as the Zoho exports, so files round-trip cleanly.</p>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary text-xs" onClick={() => exportJournals()}><Download size={13} />Journal entries ({finJournalEntries.length})</button>
          <button className="btn-secondary text-xs" onClick={() => exportDocs()}><Download size={13} />Documents ({finDocuments.length})</button>
          <button className="btn-secondary text-xs" onClick={() => exportTrialBalance()}><Download size={13} />Trial balance</button>
        </div>
      </div>
    </div>
  );
}
