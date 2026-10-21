import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Calendar, Wrench, DollarSign, Plus, MapPin, Layers3, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate, compareFloors, normalizeFloor } from '../../utils/helpers';

export default function FMAssets() {
  const navigate = useNavigate();
  const { currentUser, assets, activeSiteId, createAsset, updateAsset } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const siteAssets = assets.filter(a => a.siteId === siteId);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', floor: '', location: '', purchaseDate: '', installationDate: '', shelfLifeMonths: '', status: 'operational' as 'operational' | 'under_repair' | 'decommissioned' });
  const floorGroups = Object.entries(siteAssets.reduce<Record<string, typeof siteAssets>>((groups, asset) => {
    const floor = asset.floor?.trim() ? normalizeFloor(asset.floor) : 'Unspecified location';
    groups[floor] = [...(groups[floor] ?? []), asset];
    return groups;
  }, {})).sort(([a], [b]) => a === 'Unspecified location' ? 1 : b === 'Unspecified location' ? -1 : compareFloors(a, b));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const floorOptions = useMemo(() => {
    const defaults = ['Basement', 'Ground Floor External (GFL EXT)', 'Ground floor', 'First floor', 'Second floor', 'Third floor', 'Penthouse', 'Roof', 'External'];
    const siteFloors = siteAssets.map(a => a.floor).filter(Boolean) as string[];
    return Array.from(new Set([...siteFloors, ...defaults].map(normalizeFloor))).sort(compareFloors);
  }, [siteAssets]);

  const EMPTY_FORM = { name: '', category: '', floor: '', location: '', purchaseDate: '', installationDate: '', shelfLifeMonths: '', status: 'operational' as const };

  const saveAsset = async () => {
    if (!form.name.trim() || !siteId) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = { name: form.name.trim(), category: form.category.trim() || undefined, floor: form.floor.trim() || undefined, location: form.location.trim() || undefined, purchaseDate: form.purchaseDate || undefined, installationDate: form.installationDate || undefined, shelfLifeMonths: form.shelfLifeMonths ? Number(form.shelfLifeMonths) : undefined, status: form.status };
      if (editingId) await updateAsset(editingId, payload);
      else await createAsset({ ...payload, siteId });
      setNotice(`"${payload.name}" ${editingId ? 'updated' : 'registered'} successfully.`);
      setTimeout(() => setNotice(''), 4000);
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
      setAdding(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save the asset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (asset: typeof siteAssets[number]) => {
    setForm({
      name: asset.name, category: asset.category ?? '', floor: asset.floor ?? '', location: asset.location ?? '',
      purchaseDate: asset.purchaseDate ?? '', installationDate: asset.installationDate ?? '',
      shelfLifeMonths: asset.shelfLifeMonths != null ? String(asset.shelfLifeMonths) : '', status: asset.status,
    });
    setEditingId(asset.id);
    setAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const STATUS_CONFIG = {
    operational:    { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: 'bg-emerald-50', label: 'Operational' },
    under_repair:   { badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',   icon: 'bg-amber-50',   label: 'Under Repair' },
    decommissioned: { badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500',     icon: 'bg-red-50',     label: 'Decommissioned' },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Site assets</h1>
          <p className="page-subtitle">{siteAssets.length} assets registered · {siteAssets.filter(a => a.status === 'under_repair').length} under repair</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/fm/request/new')} className="btn-ghost">
            <Plus size={13} /> Log issue
          </button>
          <button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setAdding(v => !v); }} className="btn-acc">
            <Plus size={13} /> Register asset
          </button>
        </div>
      </div>

      {notice && (
        <div className="card p-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100">{notice}</div>
      )}

      {adding && (
        <div className="card" style={{ padding: '14px 15px' }}>
          <div className="card-hd"><div><div className="card-title">{editingId ? 'Edit asset' : 'Register asset'}</div><div className="card-sub">{editingId ? 'Update this asset’s details' : 'Adds the asset to this facility\'s register'}</div></div></div>
          <div className="row3">
            <div className="form-field"><label>Asset name <span className="req">*</span></label>
              <input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LIFT-001 — Passenger lift" /></div>
            <div className="form-field"><label>Category</label>
              <input className="inp" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. HVAC, Generator" /></div>
            <div className="form-field"><label>Floor or level</label>
              <input className="inp" list="asset-floor-options" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="e.g. First floor" />
              <datalist id="asset-floor-options">
                {floorOptions.map(floor => <option key={floor} value={floor} />)}
              </datalist></div>
            <div className="form-field"><label>Area or room</label>
              <input className="inp" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. East wing plant room" /></div>
            <div className="form-field"><label>Purchase date</label>
              <input className="inp" type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
            <div className="form-field"><label>Installation date</label>
              <input className="inp" type="date" value={form.installationDate} onChange={e => setForm(f => ({ ...f, installationDate: e.target.value }))} /></div>
            <div className="form-field"><label>Estimated shelf life (months)</label>
              <input className="inp" type="number" min={0} value={form.shelfLifeMonths} onChange={e => setForm(f => ({ ...f, shelfLifeMonths: e.target.value }))} /></div>
            <div className="form-field"><label>Status</label>
              <select className="sel" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
                <option value="operational">Operational</option>
                <option value="under_repair">Under repair</option>
                <option value="decommissioned">Decommissioned</option>
              </select></div>
          </div>
          {saveError && <p className="text-xs text-red-600 mt-3">{saveError}</p>}
          <div className="flex gap-2 mt-3">
            <button className="btn-ghost" onClick={() => { setAdding(false); setEditingId(null); setSaveError(''); setForm({ ...EMPTY_FORM }); }}>Cancel</button>
            <button className="btn-acc" onClick={saveAsset} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : editingId ? 'Update asset' : 'Save asset'}</button>
          </div>
        </div>
      )}

      {floorGroups.map(([floor, floorAssets]) => {
        const isCollapsed = collapsed.has(floor);
        const floorId = `floor-${floor.replace(/\s+/g, '-').toLowerCase()}`;
        return (
        <section key={floor} className="space-y-3" aria-labelledby={floorId}>
          <button
            type="button"
            onClick={() => setCollapsed(prev => { const next = new Set(prev); if (next.has(floor)) next.delete(floor); else next.add(floor); return next; })}
            className="flex items-center gap-2 w-full text-left"
            aria-expanded={!isCollapsed}
            aria-controls={`${floorId}-assets`}
          >
            {isCollapsed ? <ChevronRight size={15} style={{ color: 'var(--green)' }} aria-hidden="true" /> : <ChevronDown size={15} style={{ color: 'var(--green)' }} aria-hidden="true" />}
            <Layers3 size={15} style={{ color: 'var(--green)' }} aria-hidden="true" />
            <h2 id={floorId} className="section-title">{floor}</h2>
            <span className="badge b-neu">{floorAssets.length} asset{floorAssets.length === 1 ? '' : 's'}</span>
          </button>
          {!isCollapsed && <div id={`${floorId}-assets`} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {floorAssets.map(asset => {
              const sc = STATUS_CONFIG[asset.status];
              return (
                <div key={asset.id} className="card-hover p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${sc.icon} flex items-center justify-center flex-shrink-0`}><Package size={17} className={sc.dot.replace('bg-', 'text-')} /></div>
                      <div>
                        <h3 className="section-title">{asset.name}</h3>
                        {asset.location && <p className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--gh-muted)' }}><MapPin size={11} aria-hidden="true" />{asset.location}</p>}
                        <span className={`badge mt-1.5 ${sc.badge}`}><span className={`badge-dot ${sc.dot}`} />{sc.label}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(asset)} className="btn-ghost"><Pencil size={12} /> Edit</button>
                      <button onClick={() => navigate(`/fm/request/new?asset=${asset.id}`)} className="btn-ghost"><Plus size={12} /> Log issue</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {asset.category && <div className="flex items-center gap-2" style={{ color: 'var(--gh-muted)' }}><Package size={13} /><span className="text-xs">{asset.category}</span></div>}
                    <div className="flex items-center gap-2" style={{ color: 'var(--gh-muted)' }}><Calendar size={13} /><span className="text-xs">Installed {formatDate(asset.installationDate)}</span></div>
                    <div className="flex items-center gap-2" style={{ color: 'var(--gh-muted)' }}><Calendar size={13} /><span className="text-xs">Purchased {formatDate(asset.purchaseDate ?? '')}</span></div>
                    <div className="flex items-center gap-2" style={{ color: 'var(--gh-muted)' }}><Wrench size={13} /><span className="text-xs">Last repair {formatDate(asset.lastRepairDate)}</span></div>
                    {asset.shelfLifeMonths != null && <div className="flex items-center gap-2" style={{ color: 'var(--gh-muted)' }}><Calendar size={13} /><span className="text-xs">Shelf life {asset.shelfLifeMonths} months</span></div>}
                    <div className="flex items-center gap-2 col-span-2" style={{ color: 'var(--gh-muted)' }}><DollarSign size={13} /><span className="text-xs">Total repair cost: <strong style={{ color: 'var(--gh-text)' }}>{formatCurrency(asset.totalRepairCost)}</strong></span></div>
                  </div>
                  {asset.maintenanceHistory.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="label mb-2">Recent maintenance</p>
                      <div className="space-y-2">{asset.maintenanceHistory.slice(0, 2).map(record => (
                        <div key={record.id} className="flex items-start justify-between"><div><p className="text-xs font-semibold">{record.description}</p><p className="text-xs mt-0.5" style={{ color: 'var(--gh-muted)' }}>{formatDate(record.date)}</p></div><span className="mono">{formatCurrency(record.cost)}</span></div>
                      ))}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>}
        </section>
        );
      })}

      {siteAssets.length === 0 && (
        <div className="card empty-state"><div><Package size={24} className="mx-auto mb-3" /><strong>No assets registered</strong><span>Use “Register asset” to add equipment and assign it to a floor or location.</span></div></div>
      )}
    </div>
  );
}
