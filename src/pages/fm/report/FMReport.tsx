import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, Download, Printer, RotateCcw,
  Trash2, Upload, X,
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { fetchFmReport, saveFmReport } from '../../../lib/db';
import {
  PREVIEW_CSS, STATUS_COLOR, STATUSES, calc, currentPeriod, daysIn, dec,
  fullDocument, monthName, money, nextPeriod, n, reportHtml, rollForward, seed, uid,
} from './model';
import type { ReportItem, ReportState } from './model';

type Tab = 'items' | 'energy' | 'works' | 'money' | 'setup' | 'preview';
const TABS: { key: Tab; label: string }[] = [
  { key: 'items', label: 'Report items' },
  { key: 'energy', label: 'Diesel & meter' },
  { key: 'works', label: 'Invoices & works' },
  { key: 'money', label: 'Financials' },
  { key: 'setup', label: 'Setup' },
  { key: 'preview', label: 'Preview' },
];

function shrink(file: File, max = 780, q = 0.62): Promise<string> {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
        cv.getContext('2d')!.drawImage(im, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', q));
      };
      im.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  });
}

export default function FMReport() {
  const { currentUser, sites, activeSiteId } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const site = sites.find(s => s.id === siteId);

  const [S, setS] = useState<ReportState | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>('items');
  const [status, setStatus] = useState('Loading…');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- load / save ---------- */
  const load = useCallback(async (sid: string, period: string) => {
    setStatus('Loading…');
    try {
      const row = await fetchFmReport(sid, period);
      if (row) {
        const merged = { ...seed(site?.name ?? '', currentUser?.name ?? '', period), ...(row.payload as Partial<ReportState>) } as ReportState;
        setS(merged);
        setPhotos(row.photos);
      } else {
        setS(seed(site?.name ?? '', currentUser?.name ?? '', period));
        setPhotos({});
      }
      setStatus('Saved');
    } catch {
      setStatus('Could not load — check connection');
    }
  }, [site?.name, currentUser?.name]);

  useEffect(() => { if (siteId) void load(siteId, currentPeriod()); }, [siteId, load]);

  const scheduleSave = useCallback((next: ReportState, nextPhotos: Record<string, string>) => {
    if (!siteId) return;
    setStatus('Saving…');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveFmReport(siteId, next.period, next as unknown as Record<string, unknown>, nextPhotos, currentUser?.id)
        .then(() => setStatus('Saved'))
        .catch(() => setStatus('Not saved — back up'));
    }, 700);
  }, [siteId, currentUser?.id]);

  /** Apply a mutation to a cloned state and schedule persistence. */
  const mutate = useCallback((fn: (draft: ReportState) => void, nextPhotos?: Record<string, string>) => {
    setS(prev => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      fn(draft);
      scheduleSave(draft, nextPhotos ?? photos);
      return draft;
    });
    if (nextPhotos) setPhotos(nextPhotos);
  }, [photos, scheduleSave]);

  const setPeriod = (period: string) => {
    if (!siteId || !S) return;
    // Persist current month before switching so nothing is lost
    void saveFmReport(siteId, S.period, S as unknown as Record<string, unknown>, photos, currentUser?.id).catch(() => undefined);
    setOpenIds(new Set());
    void load(siteId, period);
  };

  /* ---------- items ---------- */
  const updateItem = (id: string, patch: Partial<ReportItem>) =>
    mutate(d => { const it = d.items.find(x => x.id === id); if (it) Object.assign(it, patch); });

  const addItem = (section: string) =>
    mutate(d => {
      const it: ReportItem = { id: uid(), section, name: '', status: 'good', notes: '', action: '', ref: '', photos: [] };
      const last = d.items.map(x => x.section).lastIndexOf(section);
      if (last === -1) d.items.push(it); else d.items.splice(last + 1, 0, it);
      setOnlyFlagged(false);
      setOpenIds(new Set([it.id]));
    });

  const moveItem = (id: string, dir: -1 | 1) =>
    mutate(d => {
      const i = d.items.findIndex(x => x.id === id), j = i + dir;
      if (j < 0 || j >= d.items.length || d.items[j].section !== d.items[i].section) return;
      [d.items[i], d.items[j]] = [d.items[j], d.items[i]];
    });

  const removeItem = (id: string) =>
    mutate(d => {
      const it = d.items.find(x => x.id === id);
      if (it) it.photos.forEach(p => { delete photos[p]; });
      d.items = d.items.filter(x => x.id !== id);
    }, { ...photos });

  const addPhotos = async (it: ReportItem, files: FileList | null) => {
    if (!files?.length) return;
    const next = { ...photos };
    const ids: string[] = [];
    for (const f of Array.from(files)) {
      const pid = uid();
      next[pid] = await shrink(f);
      ids.push(pid);
    }
    mutate(d => { const item = d.items.find(x => x.id === it.id); if (item) item.photos = [...item.photos, ...ids]; }, next);
  };

  const removePhoto = (it: ReportItem, pid: string) => {
    const next = { ...photos };
    delete next[pid];
    mutate(d => { const item = d.items.find(x => x.id === it.id); if (item) item.photos = item.photos.filter(p => p !== pid); }, next);
  };

  /* ---------- generic tables ---------- */
  interface Col { key: string; label: string; w: number; num?: boolean; }
  function EditTable<T extends { id: string }>(props: { cols: Col[]; rows: T[]; onChange: (rows: T[]) => void; onAdd: () => void; addLabel: string }) {
    return (
      <div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200">{props.cols.map(c => <th key={c.key} className="text-left text-xs font-semibold text-slate-500 px-1.5 py-1">{c.label}</th>)}<th className="w-8" /></tr></thead>
          <tbody>
            {props.rows.map(r => (
              <tr key={r.id} className="border-b border-slate-100">
                {props.cols.map(c => (
                  <td key={c.key} style={{ width: `${c.w * 12}%` }} className="px-0.5 py-0.5">
                    <input
                      className={`input !py-1 !px-1.5 text-xs ${c.num ? 'text-right tabular-nums' : ''}`}
                      type={c.num ? 'number' : 'text'} step="0.01"
                      value={String(r[c.key as keyof T] ?? '')}
                      onChange={e => props.onChange(props.rows.map(x => x.id === r.id ? { ...x, [c.key]: c.num ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value } : x))}
                    />
                  </td>
                ))}
                <td><button type="button" onClick={() => props.onChange(props.rows.filter(x => x.id !== r.id))} className="text-slate-300 hover:text-red-500 px-1"><X size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-2.5 flex-wrap">
          <button type="button" onClick={props.onAdd} className="btn-secondary text-xs py-1">{`+ ${props.addLabel}`}</button>
        </div>
      </div>
    );
  }

  /* ---------- actions ---------- */
  const roll = () => {
    if (!S) return;
    if (!confirm(`Roll forward to ${monthName(nextPeriod(S.period))}?\n\nStatuses, wording, vendors and outstanding works are kept so you can edit them.\nDaily readings, photos and this month's invoices are cleared, and closing balances become the new opening balances.`)) return;
    const next = rollForward(S);
    setS(next); setPhotos({}); setOpenIds(new Set());
    scheduleSave(next, {});
  };

  const backup = () => {
    if (!S) return;
    const blob = new Blob([JSON.stringify({ S, photos })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `FM-Report-${siteId}-${S.period}.json`;
    a.click();
  };

  const restore = (file: File | undefined) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(String(fr.result)) as { S: ReportState; photos: Record<string, string> };
        if (!o?.S?.period) throw new Error('bad file');
        setS({ ...seed(site?.name ?? '', currentUser?.name ?? ''), ...o.S });
        setPhotos(o.photos ?? {});
        scheduleSave(o.S, o.photos ?? {});
        alert('Restored.');
      } catch { alert('That file could not be read.'); }
    };
    fr.readAsText(file);
  };

  const print = () => {
    if (!S) return;
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to export the PDF.'); return; }
    w.document.write(fullDocument(S, photos));
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 350);
  };

  /* ---------- render ---------- */
  const c = useMemo(() => (S ? calc(S) : null), [S]);
  const delta = (v: number) => (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${v > 0 ? 'bg-red-50 text-red-700' : v < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {v > 0 ? '+' : ''}{dec(v, 2)}%
    </span>
  );

  if (!S || !c) {
    return <div className="card p-14 text-center text-sm text-slate-500">{status}</div>;
  }

  const dd = daysIn(S.period);
  const shown = S.items.filter(i => !onlyFlagged || i.action || i.notes || i.status !== 'good');
  const sections = [...new Set(shown.map(i => i.section))];

  const stat = (label: string, val: React.ReactNode, total = false) => (
    <div className={`flex items-center justify-between gap-4 py-1.5 text-sm border-b border-dotted border-slate-200 ${total ? 'border-b-2 border-solid border-slate-800 font-bold' : ''}`}>
      <span className={total ? '' : 'text-slate-600'}>{label}</span><b className="tabular-nums">{val}</b>
    </div>
  );

  const numField = (label: string, value: number | '', onChange: (v: number | '') => void) => (
    <div><label className="label">{label}</label>
      <input className="input text-right tabular-nums" type="number" step="0.01" value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></div>
  );

  return (
    <div className="space-y-5">
      <style>{PREVIEW_CSS}</style>

      {/* Top bar */}
      <div className="dash-header">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Monthly report</p>
            <h1 className="text-2xl font-black text-white tracking-tight">{site?.name ?? 'Facility'} — facilities report</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="month" value={S.period} onChange={e => e.target.value && setPeriod(e.target.value)}
              className="input !w-40 !bg-white/10 !border-white/25 !text-white [color-scheme:dark]" />
            <span className={`text-xs font-semibold ${status === 'Saved' ? 'text-emerald-300' : 'text-amber-300'}`}>{status}</span>
            <button type="button" onClick={roll} className="btn-white-glass text-xs"><RotateCcw size={13} />Start next month</button>
            <button type="button" onClick={backup} className="btn-white-glass text-xs"><Download size={13} />Back up</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-white-glass text-xs"><Upload size={13} />Restore</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={e => restore(e.target.files?.[0])} />
            <button type="button" onClick={print} className="btn-primary"><Printer size={14} />Save as PDF</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b flex-wrap" style={{ borderColor: 'var(--gh-border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${tab === t.key ? 'border-b-2' : 'text-slate-400 hover:text-slate-600'}`}
            style={tab === t.key ? { borderColor: 'var(--acc)', color: 'var(--green)' } : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ ITEMS ============ */}
      {tab === 'items' && (
        <div className="space-y-3">
          <div className="alert-info">Everything carries over from last month. Open only the items that changed, update the status and the notes, and leave the rest alone.</div>
          <div className="card p-4 flex items-center gap-2 flex-wrap">
            <button className={`btn-secondary text-xs py-1 ${!onlyFlagged ? '!bg-slate-800 !text-white' : ''}`} onClick={() => setOnlyFlagged(false)}>All items</button>
            <button className={`btn-secondary text-xs py-1 ${onlyFlagged ? '!bg-slate-800 !text-white' : ''}`} onClick={() => setOnlyFlagged(true)}>Only items with notes or issues</button>
            <span className="flex-1" />
            <span className="text-xs text-slate-400">{shown.length} of {S.items.length} items shown</span>
          </div>

          {sections.map(sec => (
            <div key={sec}>
              <div className="flex items-baseline gap-2 mt-5 mb-1.5">
                <h3 className="text-sm font-bold text-slate-800">{sec}</h3>
                <span className="text-xs text-slate-400">{shown.filter(i => i.section === sec).length} item{shown.filter(i => i.section === sec).length === 1 ? '' : 's'}</span>
                <span className="flex-1" />
                <button className="btn-secondary text-xs py-1" onClick={() => addItem(sec)}>Add item here</button>
              </div>
              <div className="space-y-1.5">
                {shown.filter(i => i.section === sec).map(it => {
                  const open = openIds.has(it.id);
                  return (
                    <div key={it.id} className={`bg-white border rounded-xl overflow-hidden transition-colors ${open ? 'border-blue-400 shadow-sm' : 'border-slate-200'}`}>
                      <button type="button" onClick={() => setOpenIds(prev => { const s = new Set(prev); if (s.has(it.id)) s.delete(it.id); else s.add(it.id); return s; })}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[it.status] }} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-slate-800 truncate">{it.name || <em className="text-slate-400">Untitled item — open to name it</em>}</span>
                          <span className="block text-xs text-slate-400 truncate">{it.ref || it.action || 'No entry this month'}</span>
                        </span>
                        {it.photos.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 whitespace-nowrap">{it.photos.length} photo{it.photos.length > 1 ? 's' : ''}</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ borderColor: STATUS_COLOR[it.status], color: STATUS_COLOR[it.status] }}>
                          {STATUSES.find(x => x[0] === it.status)?.[1]}
                        </span>
                        {open ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
                      </button>
                      {open && (
                        <div className="px-3 pb-4 pt-0 border-t border-slate-100 space-y-3">
                          <div className="mt-3"><label className="label">Item name, as it appears in the report</label>
                            <input className="input" value={it.name} placeholder="e.g. Lift car interior" onChange={e => updateItem(it.id, { name: e.target.value })} /></div>
                          <div className="flex gap-1.5 flex-wrap">
                            {STATUSES.map(([v, l]) => (
                              <button key={v} type="button" onClick={() => updateItem(it.id, { status: v })}
                                className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${it.status === v ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}
                                style={it.status === v ? { background: STATUS_COLOR[v] } : undefined}>
                                {l}
                              </button>
                            ))}
                          </div>
                          <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3">
                            <label className="label">Rough notes — type it however it comes out</label>
                            <textarea className="input" rows={2} value={it.notes}
                              placeholder="e.g. gen tripped twice, mantrac came 12th, says tank too low, monitoring"
                              onChange={e => updateItem(it.id, { notes: e.target.value })} />
                            <p className="text-[11px] text-blue-700/70 mt-1">Then write the final wording in the two boxes below — action on the left, report summary on the right.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label className="label">Action taken</label>
                              <textarea className="input" rows={7} value={it.action} onChange={e => updateItem(it.id, { action: e.target.value })} /></div>
                            <div><label className="label">Management report reference</label>
                              <textarea className="input" rows={7} value={it.ref} onChange={e => updateItem(it.id, { ref: e.target.value })} /></div>
                          </div>
                          <div>
                            <label className="label">Pictures</label>
                            <input type="file" accept="image/*" multiple className="text-xs text-slate-500" onChange={e => { void addPhotos(it, e.target.files); e.target.value = ''; }} />
                            {it.photos.length > 0 && (
                              <div className="flex gap-2 flex-wrap mt-2">
                                {it.photos.map(pid => photos[pid] && (
                                  <div key={pid} className="relative w-20 h-14 rounded-md overflow-hidden border border-slate-200">
                                    <img src={photos[pid]} alt="" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removePhoto(it, pid)}
                                      className="absolute top-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-black/60 text-white text-xs leading-none p-0.5"><X size={10} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button type="button" className="btn-secondary text-xs py-1" onClick={() => moveItem(it.id, -1)}>Move up</button>
                            <button type="button" className="btn-secondary text-xs py-1" onClick={() => moveItem(it.id, 1)}>Move down</button>
                            <button type="button" className="btn-secondary text-xs py-1 !text-red-600" onClick={() => confirm(`Remove "${it.name || 'this item'}" from the report?`) && removeItem(it.id)}>
                              <Trash2 size={11} />Remove item
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-3">
            <button className="btn-secondary text-xs" onClick={() => { const nm = prompt('Name of the new section, e.g. LIFT & VERTICAL TRANSPORT'); if (nm?.trim()) addItem(nm.trim().toUpperCase()); }}>
              Add a new section
            </button>
          </div>
        </div>
      )}

      {/* ============ ENERGY ============ */}
      {tab === 'energy' && (
        <div className="space-y-5">
          <div className="alert-info">Type the daily readings. Everything on the diesel and energy pages of the report is calculated from them.</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="section-title">Diesel tank</h2>
              <p className="text-xs text-slate-400 mb-3">Enter the level you read each day. Blank days repeat the day before. Add litres and rate on a restock day.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {numField('Opening stock (litres)', S.diesel.open, v => mutate(d => { d.diesel.open = v; }))}
                {numField('Budget (litres)', S.diesel.budLtr, v => mutate(d => { d.diesel.budLtr = v; }))}
                {numField('Budget rate (₦/litre)', S.diesel.budRate, v => mutate(d => { d.diesel.budRate = v; }))}
                {numField('Costing rate (₦/litre)', S.diesel.costRate, v => mutate(d => { d.diesel.costRate = v; }))}
              </div>
              <div className="max-h-[480px] overflow-auto border border-slate-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200"><th className="text-left text-xs font-semibold text-slate-500 px-2 py-1.5">Day</th><th className="text-left text-xs font-semibold text-slate-500 px-2 py-1.5">Level (L)</th><th className="text-left text-xs font-semibold text-slate-500 px-2 py-1.5">Bought (L)</th><th className="text-left text-xs font-semibold text-slate-500 px-2 py-1.5">₦/L</th></tr></thead>
                  <tbody>
                    {S.diesel.days.filter(r => r.d <= dd).map(r => (
                      <tr key={r.d} className="border-b border-slate-100">
                        <td className="text-xs text-slate-400 px-2 py-0.5">{r.d}</td>
                        {(['level', 'qty', 'rate'] as const).map(k => (
                          <td key={k} className="px-0.5 py-0.5">
                            <input className="input !py-1 !px-1.5 text-xs text-right tabular-nums" type="number" step="0.01" value={r[k]}
                              onChange={e => mutate(d => { const row = d.diesel.days.find(x => x.d === r.d)!; row[k] = e.target.value === '' ? '' : Number(e.target.value); })} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card p-5">
              <h2 className="section-title">Grid meter</h2>
              <p className="text-xs text-slate-400 mb-3">Prepaid meter balance each day, plus any units bought.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {numField('Opening reading (kWh)', S.grid.open, v => mutate(d => { d.grid.open = v; }))}
                {numField('Budget (kWh)', S.grid.budKwh, v => mutate(d => { d.grid.budKwh = v; }))}
                {numField('Rate (₦/kWh)', S.grid.rate, v => mutate(d => { d.grid.rate = v; }))}
                {numField('Budget rate (₦/kWh)', S.grid.budRate, v => mutate(d => { d.grid.budRate = v; }))}
                {numField('Budget amount (₦)', S.grid.budAmt, v => mutate(d => { d.grid.budAmt = v; }))}
                {numField('VAT rate', S.grid.vat, v => mutate(d => { d.grid.vat = v; }))}
              </div>
              <div className="max-h-[480px] overflow-auto border border-slate-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200"><th className="text-left text-xs font-semibold text-slate-500 px-2 py-1.5">Day</th><th className="text-left text-xs font-semibold text-slate-500 px-2 py-1.5">Meter (kWh)</th><th className="text-left text-xs font-semibold text-slate-500 px-2 py-1.5">Bought (kWh)</th></tr></thead>
                  <tbody>
                    {S.grid.days.filter(r => r.d <= dd).map(r => (
                      <tr key={r.d} className="border-b border-slate-100">
                        <td className="text-xs text-slate-400 px-2 py-0.5">{r.d}</td>
                        {(['read', 'bought'] as const).map(k => (
                          <td key={k} className="px-0.5 py-0.5">
                            <input className="input !py-1 !px-1.5 text-xs text-right tabular-nums" type="number" step="0.01" value={r[k]}
                              onChange={e => mutate(d => { const row = d.grid.days.find(x => x.d === r.d)!; row[k] = e.target.value === '' ? '' : Number(e.target.value); })} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="section-title mb-2">This month</h2>
              {stat('Diesel consumed', <span>{dec(c.dCons)} L {delta(c.pDiesel)}</span>)}
              {stat('Diesel cost', `₦${money(c.dNgn)}`)}
              {stat('Diesel against budget', `${dec(c.dVar)} L ${c.dVar >= 0 ? 'under' : 'over'}`)}
              {stat('Grid consumed', <span>{dec(c.gCons)} kWh {delta(c.pGrid)}</span>)}
              {stat('Grid cost including VAT', `₦${money(c.gTotal)}`)}
              {stat('Total energy cost', <span>₦{money(c.total)} {delta(c.pTotal)}</span>, true)}
              {stat('Per m², per month', `₦${money(c.perM2)}`)}
              {stat('Per m², per day', `₦${money(c.perDay)}`)}
              {stat('Per m², per hour', `₦${money(c.perHour)}`)}
            </div>
            <div className="card p-5">
              <h2 className="section-title mb-1">Last month, for comparison</h2>
              <p className="text-xs text-slate-400 mb-3">Filled in automatically when you press "Start next month".</p>
              <div className="grid grid-cols-2 gap-3">
                {numField('Diesel consumed (litres)', S.prev.diesel, v => mutate(d => { d.prev.diesel = v; }))}
                {numField('Grid consumed (kWh)', S.prev.grid, v => mutate(d => { d.prev.grid = v; }))}
                {numField('Total energy cost (₦)', S.prev.total, v => mutate(d => { d.prev.total = v; }))}
                {numField('Cost per m² (₦)', S.prev.perM2, v => mutate(d => { d.prev.perM2 = v; }))}
                {numField('Daily per m² (₦)', S.prev.day, v => mutate(d => { d.prev.day = v; }))}
                {numField('Hourly per m² (₦)', S.prev.hour, v => mutate(d => { d.prev.hour = v; }))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ WORKS ============ */}
      {tab === 'works' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="section-title mb-3">Invoices for landlord approval</h2>
            <EditTable
              cols={[{ key: 'task', label: 'Task', w: 2 }, { key: 'vendor', label: 'Vendor', w: 2 }, { key: 'cost', label: 'Cost (₦)', w: 1, num: true }, { key: 'terms', label: 'Payment terms', w: 1 }, { key: 'validity', label: 'Validity', w: 1 }, { key: 'status', label: 'Status', w: 1 }]}
              rows={S.invoices}
              onChange={rows => mutate(d => { d.invoices = rows; })}
              onAdd={() => mutate(d => { d.invoices.push({ id: uid(), task: '', vendor: '', cost: '', terms: '', validity: '', status: 'PENDING' }); })}
              addLabel="Add invoice" />
            <p className="text-xs text-slate-400 mt-2">Total ₦{money(S.invoices.reduce((a, r) => a + n(r.cost), 0))}</p>
          </div>
          <div className="card p-5">
            <h2 className="section-title mb-3">Outstanding works</h2>
            <EditTable
              cols={[{ key: 'item', label: 'Item', w: 1 }, { key: 'req', label: 'Action required', w: 2 }, { key: 'taken', label: 'Action taken', w: 3 }]}
              rows={S.outstanding}
              onChange={rows => mutate(d => { d.outstanding = rows; })}
              onAdd={() => mutate(d => { d.outstanding.push({ id: uid(), item: '', req: '', taken: '' }); })}
              addLabel="Add outstanding work" />
          </div>
          <div className="card p-5">
            <h2 className="section-title mb-3">Statutory certificates</h2>
            <EditTable
              cols={[{ key: 'name', label: 'Certificate / permit', w: 2 }, { key: 'no', label: 'Number', w: 1 }, { key: 'issue', label: 'Issued', w: 1 }, { key: 'exp', label: 'Expires', w: 1 }, { key: 'note', label: 'Comments', w: 2 }, { key: 'freq', label: 'Frequency', w: 1 }]}
              rows={S.certs}
              onChange={rows => mutate(d => { d.certs = rows; })}
              onAdd={() => mutate(d => { d.certs.push({ id: uid(), name: '', no: 'N/A', issue: '', exp: '', note: '', freq: 'Annually' }); })}
              addLabel="Add certificate" />
          </div>
        </div>
      )}

      {/* ============ MONEY ============ */}
      {tab === 'money' && (
        <div className="space-y-5">
          <div className="alert-info">Closing balances calculate themselves. Enter the opening balances and the payments made.</div>
          <div className="card p-5">
            <h2 className="section-title mb-3">Company account</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {numField('Opening balance (₦)', S.money.openCo, v => mutate(d => { d.money.openCo = v; }))}
            </div>
            <EditTable
              cols={[{ key: 'date', label: 'Date', w: 1 }, { key: 'desc', label: 'Description', w: 4 }, { key: 'amt', label: 'Amount (₦)', w: 1, num: true }]}
              rows={S.money.coLines}
              onChange={rows => mutate(d => { d.money.coLines = rows; })}
              onAdd={() => mutate(d => { d.money.coLines.push({ id: uid(), date: '', desc: '', amt: '' }); })}
              addLabel="Add payment" />
            <div className="mt-3">
              {stat('Total payments', `₦${money(S.money.coLines.reduce((a, r) => a + n(r.amt), 0))}`)}
              {stat('Closing balance', `₦${money(n(S.money.openCo) - S.money.coLines.reduce((a, r) => a + n(r.amt), 0))}`, true)}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="section-title mb-3">Petty cash</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {numField('Opening balance (₦)', S.money.openPc, v => mutate(d => { d.money.openPc = v; }))}
              {numField('Petty cash requested (₦)', S.money.pcReq, v => mutate(d => { d.money.pcReq = v; }))}
            </div>
            <EditTable
              cols={[{ key: 'date', label: 'Date', w: 1 }, { key: 'desc', label: 'Description', w: 4 }, { key: 'amt', label: 'Amount (₦)', w: 1, num: true }]}
              rows={S.money.pcLines}
              onChange={rows => mutate(d => { d.money.pcLines = rows; })}
              onAdd={() => mutate(d => { d.money.pcLines.push({ id: uid(), date: '', desc: '', amt: '' }); })}
              addLabel="Add expense" />
            <div className="mt-3">
              {stat('Total spend', `₦${money(S.money.pcLines.reduce((a, r) => a + n(r.amt), 0))}`)}
              {stat('Closing petty cash', `₦${money(n(S.money.openPc) + n(S.money.pcReq) - S.money.pcLines.reduce((a, r) => a + n(r.amt), 0))}`)}
              {stat('Total closing balance', `₦${money(n(S.money.openCo) - S.money.coLines.reduce((a, r) => a + n(r.amt), 0) + n(S.money.openPc) + n(S.money.pcReq) - S.money.pcLines.reduce((a, r) => a + n(r.amt), 0))}`, true)}
            </div>
          </div>
        </div>
      )}

      {/* ============ SETUP ============ */}
      {tab === 'setup' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="section-title mb-3">Property and report details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="label">Building</label><input className="input" value={S.meta.building} onChange={e => mutate(d => { d.meta.building = e.target.value; })} /></div>
              <div><label className="label">Area</label><input className="input" value={S.meta.area} onChange={e => mutate(d => { d.meta.area = e.target.value; })} /></div>
              <div><label className="label">Type</label><input className="input" value={S.meta.type} onChange={e => mutate(d => { d.meta.type = e.target.value; })} /></div>
              <div><label className="label">Lettable area (m²), used for the per‑m² figures</label><input className="input text-right" type="number" value={S.meta.sqm} onChange={e => mutate(d => { d.meta.sqm = e.target.value === '' ? '' : Number(e.target.value); })} /></div>
              <div><label className="label">Facilities manager</label><input className="input" value={S.meta.fm} onChange={e => mutate(d => { d.meta.fm = e.target.value; })} /></div>
              <div><label className="label">Countersigned by</label><input className="input" value={S.meta.signer} onChange={e => mutate(d => { d.meta.signer = e.target.value; })} /></div>
              <div><label className="label">Report issue month shown on the cover</label><input className="input" value={S.meta.issue} onChange={e => mutate(d => { d.meta.issue = e.target.value; })} /></div>
            </div>
            <div className="mt-4">
              <label className="label">Cover photo</label>
              <input type="file" accept="image/*" className="text-xs text-slate-500" onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const data = await shrink(f, 1200, 0.72);
                mutate(d => { d.meta.cover = data; });
                e.target.value = '';
              }} />
              {S.meta.cover && (
                <div className="relative w-36 h-24 rounded-md overflow-hidden border border-slate-200 mt-2">
                  <img src={S.meta.cover} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => mutate(d => { d.meta.cover = ''; })} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white"><X size={11} className="mx-auto" /></button>
                </div>
              )}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="section-title mb-1">Recurring maintenance lines</h2>
            <p className="text-xs text-slate-400 mb-3">Listed at the end of the checklist with no tick, exactly as in your current report.</p>
            <table className="w-full text-sm">
              <tbody>
                {S.recurring.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-0.5 py-0.5"><input className="input !py-1 !px-1.5 text-xs" value={r} onChange={e => mutate(d => { d.recurring[i] = e.target.value; })} /></td>
                    <td className="w-8"><button type="button" onClick={() => mutate(d => { d.recurring.splice(i, 1); })} className="text-slate-300 hover:text-red-500 px-1"><X size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn-secondary text-xs py-1 mt-2" onClick={() => mutate(d => { d.recurring.push(''); })}>+ Add line</button>
          </div>
          <div className="card p-5">
            <h2 className="section-title mb-1">Start over</h2>
            <p className="text-xs text-slate-400 mb-3">Wipes everything saved for {monthName(S.period)} and reloads the blank template.</p>
            <button type="button" className="btn-secondary text-xs !text-red-600" onClick={() => { if (confirm('Wipe everything and reload the blank template?')) { const fresh = seed(site?.name ?? '', currentUser?.name ?? '', S.period); setS(fresh); setPhotos({}); scheduleSave(fresh, {}); } }}>
              Reset to blank template
            </button>
          </div>
        </div>
      )}

      {/* ============ PREVIEW ============ */}
      {tab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">This is exactly what the PDF will look like — A4 landscape pages.</p>
            <button type="button" onClick={print} className="btn-primary"><Printer size={14} />Save as PDF</button>
          </div>
          <div className="fmr-preview overflow-x-auto rounded-xl">
            <div className="fmr-root" dangerouslySetInnerHTML={{ __html: reportHtml(S, photos) }} />
          </div>
        </div>
      )}
    </div>
  );
}
