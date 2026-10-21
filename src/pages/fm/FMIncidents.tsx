import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle, Loader2, Pencil, Plus, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { uploadFile } from '../../lib/firestore';
import { formatDateTime } from '../../utils/helpers';
import { formatFileSize } from '../../utils/imageCompression';
import ImageUpload from '../../components/shared/ImageUpload';
import Lightbox from '../../components/shared/Lightbox';
import type { Priority, Incident } from '../../types';

const STATUS_COLORS: Record<Incident['status'], string> = {
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-amber-100 text-amber-700',
  resolved: 'bg-blue-100 text-blue-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

const INCIDENT_CATEGORIES = ['Safety / injury', 'Security', 'Fire', 'Water leak / flood', 'Electrical fault', 'Equipment damage', 'Lift entrapment', 'Cleaning / hygiene', 'Pest control', 'Vandalism', 'Other'];

export default function FMIncidents() {
  const { currentUser, sites, incidents, requests, createIncident, updateIncident, activeSiteId } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<Priority>('medium');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [photos, setPhotos] = useState<Array<{ file: File; originalSize: number; compressedSize: number }>>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !siteId) return;
    setSaving(true);
    const newAttachments = await Promise.all(photos.map(async (photo, index) => ({
      name: photo.file.name,
      url: await uploadFile(`incidents/${currentUser.id}/${Date.now()}-${index}-${photo.file.name}`, photo.file),
      originalSize: photo.originalSize,
      compressedSize: photo.compressedSize,
    })));
    if (editing) {
      await updateIncident(editing.id, { title, description, category, severity, attachments: [...editing.attachments, ...newAttachments] });
      setEditing(null);
    } else {
      await createIncident({ siteId, reportedBy: currentUser.id, title, description, category, severity, attachments: newAttachments });
    }
    setTitle(''); setDescription(''); setCategory(''); setSeverity('medium'); setPhotos([]); setShowForm(false);
    setSaving(false);
  };

  const startEdit = (incident: Incident) => {
    setEditing(incident);
    setTitle(incident.title);
    setDescription(incident.description);
    setCategory(incident.category ?? '');
    setSeverity(incident.severity);
    setPhotos([]);
    setShowForm(true);
  };

  const closeIncident = async (incident: Incident) => {
    const note = window.prompt('Closure note (recovery steps, repairs completed, follow-up):');
    if (note === null) return;
    await updateIncident(incident.id, { status: 'closed', resolvedAt: new Date().toISOString(), resolutionNotes: note.trim() });
  };

  const siteIncidents = incidents.filter(i => i.siteId === siteId);
  const incidentCategories = Array.from(new Set([...INCIDENT_CATEGORIES, ...siteIncidents.map(i => i.category).filter((c): c is string => Boolean(c))]));
  const filteredIncidents = categoryFilter === 'all' ? siteIncidents : siteIncidents.filter(i => (i.category ?? 'Uncategorised') === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Site Safety</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Incidents</h1>
          <p className="text-white/60 text-sm mt-1 font-medium">Log and track incidents across your facility.</p>
        </div>
      </div>

      <button onClick={() => { setEditing(null); setTitle(''); setDescription(''); setCategory(''); setSeverity('medium'); setPhotos([]); setShowForm(true); }} className="btn-primary"><Plus size={14} />Log incident</button>

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">{editing ? 'Update incident report' : 'New incident'}</h2><button type="button" onClick={() => { setShowForm(false); setEditing(null); }}><XCircle size={18} className="text-slate-400" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group"><label className="label">Title</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} required /></div>
            <div className="form-group"><label className="label">Category</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)} required>
                <option value="" disabled>Select category</option>
                {INCIDENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="form-group"><label className="label">Severity</label><select className="select" value={severity} onChange={e => setSeverity(e.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
          </div>
          <div className="form-group"><label className="label">Description</label><textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} required /></div>
          <div className="form-group"><label className="label">Photo evidence</label>
            {photos.map(photo => <div key={photo.file.name} className="file-uploaded"><span className="fname">{photo.file.name} · {formatFileSize(photo.compressedSize)}</span><span className="remove" onClick={() => setPhotos(current => current.filter(item => item.file !== photo.file))}>✕</span></div>)}
            <ImageUpload onUpload={() => {}} onCompress={setPhotos} maxFiles={5} compressionOptions={{ maxWidth: 1920, maxHeight: 1080, quality: 0.85, maxSizeKB: 500, format: 'jpeg' }} />
          </div>
          <button className="btn-primary" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{editing ? 'Save update' : 'Submit incident'}</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2"><AlertTriangle size={18} className="text-red-600" /><h2 className="font-black text-slate-900">Site incident log</h2></div>
          <select className="input w-auto text-xs py-1.5" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {incidentCategories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Uncategorised">Uncategorised</option>
          </select>
        </div>
        {filteredIncidents.length === 0 ? (
          <div className="p-10 text-center text-slate-500">{siteIncidents.length === 0 ? 'No incidents logged.' : 'No incidents in this category.'}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIncidents.map(incident => (
              <div key={incident.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{incident.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {incident.category && <span className="badge bg-brand-50 text-brand-700">{incident.category}</span>}
                      <span className="badge bg-slate-100 text-slate-500 capitalize">{incident.severity}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Logged {formatDateTime(incident.createdAt)}{incident.updatedAt !== incident.createdAt ? ` · Updated ${formatDateTime(incident.updatedAt)}` : ''} · {sites.find(s => s.id === incident.siteId)?.name}</p>
                    {incident.requestId && <p className="text-xs text-brand-600 mt-0.5">Linked to request {requests.find(r => r.id === incident.requestId)?.requestNumber ?? ''}</p>}
                    <p className="text-sm text-slate-600 mt-2">{incident.description}</p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[incident.status]}`}>{incident.status}</span>
                </div>
                {incident.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {incident.attachments.map(attachment => {
                      const isImage = /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(attachment.name) || /\.(png|jpe?g|gif|webp|heic|avif)([?#]|$)/i.test(attachment.url);
                      return isImage ? (
                        <button key={attachment.url} type="button" onClick={() => setLightbox(attachment.url)} className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                          <img src={attachment.url} alt={attachment.name} className="w-28 h-28 object-cover" loading="lazy" />
                        </button>
                      ) : (
                        <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="badge bg-slate-100 text-slate-600">{attachment.name}</a>
                      );
                    })}
                  </div>
                )}
                {(incident.resolvedAt || incident.resolutionNotes) && (
                  <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
                    <p className="font-semibold">Closure{incident.resolvedAt ? ` — ${formatDateTime(incident.resolvedAt)}` : ''}</p>
                    {incident.resolutionNotes && <p className="mt-1">{incident.resolutionNotes}</p>}
                  </div>
                )}
                {(currentUser?.role === 'admin' || currentUser?.role === 'facility_manager') && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEdit(incident)} className="btn-ghost text-xs py-1"><Pencil size={12} />Update report</button>
                    {incident.status !== 'closed' && incident.status !== 'resolved' && <button onClick={() => updateIncident(incident.id, { status: 'resolved', resolvedAt: new Date().toISOString() })} className="btn-success text-xs py-1"><CheckCircle size={12} />Mark resolved</button>}
                    {incident.status !== 'closed' && <button onClick={() => closeIncident(incident)} className="btn-secondary text-xs py-1">Close incident</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
