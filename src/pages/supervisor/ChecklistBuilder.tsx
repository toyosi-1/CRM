import { useMemo, useState, type FormEvent } from 'react';
import { ClipboardCheck, Lock, Plus, Save, ToggleLeft, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { scheduleLabel } from '../../lib/checklists';
import type { ChecklistTemplate, ChecklistTemplateZone, ChecklistTemplateItem } from '../../types';



const DEFAULT_ZONES: ChecklistTemplateZone[] = [
  { id: 'perimeter', name: 'Perimeter & access', icon: 'door', active: true, locked: true, items: [{ id: 'gate', name: 'Main gate and barrier', type: 'passfail', role: 'fm', locked: true }, { id: 'lights', name: 'External lighting', type: 'rating', role: 'fm', locked: true }] },
  { id: 'power', name: 'Power', icon: 'zap', active: true, locked: false, items: [{ id: 'genset', name: 'Generator status / diesel level', type: 'passfail', role: 'tech', locked: false }] },
  { id: 'water', name: 'Water systems', icon: 'droplet', active: true, locked: false, items: [] },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ChecklistBuilder() {
  const { currentUser, sites, checklistTemplates, activeSiteId } = useStore();
  const isFM = currentUser?.role === 'facility_manager';
  const fmSiteId = activeSiteId ?? currentUser?.siteId ?? '';
  const [pick, setPick] = useState<{ siteId: string; templateId: string; key: string } | null>(null);

  const validPick = pick && (!isFM || pick.siteId === fmSiteId) ? pick : null;
  const siteId = isFM ? fmSiteId : (validPick?.siteId ?? '');
  const siteTemplates = useMemo(() => checklistTemplates.filter(t => t.siteId === siteId), [checklistTemplates, siteId]);
  const templateId = validPick?.templateId ?? siteTemplates[0]?.id ?? 'new';
  const formKey = validPick?.key ?? `${siteId}:${templateId}`;
  const selectedTemplate = siteTemplates.find(t => t.id === templateId);

  const selectSite = (id: string) => {
    const first = checklistTemplates.find(t => t.siteId === id)?.id ?? 'new';
    setPick({ siteId: id, templateId: first, key: `${id}:${first}` });
  };
  const selectTemplate = (id: string) => setPick({ siteId, templateId: id, key: `${siteId}:${id}` });

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Operations</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Checklist builder</h1>
          <p className="text-white/60 text-sm mt-1">Configure zones, item types, and assignment for daily walks.</p>
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group"><label className="label">Facility</label>{isFM ? <input className="input" value={sites.find(s => s.id === siteId)?.name ?? 'Your facility'} disabled /> : <select className="select" value={siteId} onChange={e => selectSite(e.target.value)} required><option value="">Select site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}</div>
        <div className="form-group"><label className="label">Template</label>
          <select className="select" value={templateId} onChange={e => selectTemplate(e.target.value)} disabled={!siteId}>
            {siteTemplates.map(t => <option key={t.id} value={t.id}>{t.title} — {scheduleLabel(t)}</option>)}
            {templateId !== 'new' && !selectedTemplate && <option value={templateId}>Saved template</option>}
            <option value="new">New template</option>
          </select>
        </div>
      </div>

      {siteId && (
        <TemplateForm
          key={formKey}
          siteId={siteId}
          templateId={templateId}
          template={selectedTemplate}
          onCreated={id => setPick({ siteId, templateId: id, key: formKey })}
        />
      )}
    </div>
  );
}

function TemplateForm({ siteId, templateId, template, onCreated }: { siteId: string; templateId: string; template?: ChecklistTemplate; onCreated: (id: string) => void }) {
  const { currentUser, createChecklistTemplate, updateChecklistTemplate } = useStore();
  const [title, setTitle] = useState(template?.title ?? 'Daily walk');
  const [frequency, setFrequency] = useState<ChecklistTemplate['frequency']>(template?.frequency ?? 'daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(template?.daysOfWeek ?? []);
  const [zones, setZones] = useState<ChecklistTemplateZone[]>(template?.zones ?? DEFAULT_ZONES);
  const [saving, setSaving] = useState(false);
  const canManage = currentUser?.role === 'supervisor' || currentUser?.role === 'admin' || currentUser?.role === 'facility_manager';

  const toggleDay = (day: number) => {
    setDaysOfWeek(current => current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => a - b));
  };

  const toggleZone = (zoneId: string) => {
    setZones(current => current.map(z => z.id === zoneId ? { ...z, active: !z.active } : z));
  };

  const addItem = (zoneId: string, name: string, type: ChecklistTemplateItem['type'], role: ChecklistTemplateItem['role']) => {
    setZones(current => current.map(z => z.id === zoneId ? { ...z, items: [...z.items, { id: crypto.randomUUID(), name, type, role }] } : z));
  };

  const removeItem = (zoneId: string, itemId: string) => {
    setZones(current => current.map(z => z.id === zoneId ? { ...z, items: z.items.filter(i => i.id !== itemId) } : z));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!siteId || !canManage) return;
    setSaving(true);
    const payload = { siteId, title, frequency, daysOfWeek: frequency === 'daily' ? daysOfWeek : [], zones: zones.map(z => ({ ...z, active: z.active ?? true })) };
    try {
      if (templateId !== 'new') await updateChecklistTemplate(templateId, payload);
      else {
        const id = crypto.randomUUID();
        await createChecklistTemplate({ ...payload, id });
        onCreated(id);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={save} className="card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group"><label className="label">Template name</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} required /></div>
          <div className="form-group"><label className="label">Frequency</label><select className="select" value={frequency} onChange={e => setFrequency(e.target.value as ChecklistTemplate['frequency'])}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
        </div>
        {frequency === 'daily' && (
          <div className="form-group">
            <label className="label">Days of the week</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((label, day) => (
                <button key={label} type="button" aria-pressed={daysOfWeek.includes(day)} onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${daysOfWeek.includes(day) ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{label}</button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">{daysOfWeek.length === 0 ? 'No days selected — runs every day.' : 'Only generated on the selected days.'}</p>
          </div>
        )}
        <button className="btn-primary" disabled={saving || !canManage}><Save size={14} />{saving ? 'Saving…' : templateId === 'new' ? 'Create template' : 'Save template'}</button>
      </form>

      <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-black text-slate-900 mb-3 flex items-center gap-2"><ClipboardCheck size={16} className="text-brand-600" />Zones</h2>
            <div className="space-y-3">
              {zones.map(zone => (
                <div key={zone.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="font-bold text-slate-800">{zone.name}</span>{zone.locked && <Lock size={12} className="text-slate-400" />}</div>
                    <label className="flex items-center gap-2 text-sm text-slate-600"><ToggleLeft size={16} /><input type="checkbox" checked={zone.active ?? true} onChange={() => !zone.locked && toggleZone(zone.id)} disabled={zone.locked} className="rounded" />Active</label>
                  </div>
                  <div className="space-y-2 pl-4">
                    {zone.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                        <span>{item.name}</span>
                        <div className="flex items-center gap-2"><span className="badge bg-slate-200 text-slate-600 text-[10px]">{item.type}</span><span className="badge bg-blue-50 text-blue-700 text-[10px]">{item.role}</span>{!item.locked && <button type="button" onClick={() => removeItem(zone.id, item.id)}><Trash2 size={12} className="text-red-500" /></button>}</div>
                      </div>
                    ))}
                    <NewItemForm onAdd={(name, type, role) => addItem(zone.id, name, type, role)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </>
  );
}

function NewItemForm({ onAdd }: { onAdd: (name: string, type: ChecklistTemplateItem['type'], role: ChecklistTemplateItem['role']) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChecklistTemplateItem['type']>('passfail');
  const [role, setRole] = useState<ChecklistTemplateItem['role']>('fm');
  const add = () => { if (!name.trim()) return; onAdd(name, type, role); setName(''); };
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <input className="input text-sm flex-1 min-w-[180px]" value={name} onChange={e => setName(e.target.value)} placeholder="Custom item name" />
      <select className="select text-sm" value={type} onChange={e => setType(e.target.value as ChecklistTemplateItem['type'])}><option value="rating">Condition rating</option><option value="passfail">Pass / fail</option><option value="numeric">Numeric reading</option></select>
      <select className="select text-sm" value={role} onChange={e => setRole(e.target.value as ChecklistTemplateItem['role'])}><option value="fm">FM only</option><option value="tech">Technician only</option><option value="both">Both</option></select>
      <button type="button" onClick={add} className="btn-primary text-xs"><Plus size={12} />Add</button>
    </div>
  );
}
