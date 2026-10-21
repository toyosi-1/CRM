import { useRef, useState, type FormEvent } from 'react';
import { Headphones, Loader2, MessageSquare, Paperclip, Plus, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { uploadFile } from '../../lib/db';
import Lightbox from '../../components/shared/Lightbox';
import { formatDateTime } from '../../utils/helpers';
import type { SupportTicket } from '../../types';

const STATUS_COLORS: Record<SupportTicket['status'], string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
};

export default function SupportTickets() {
  const { currentUser, supportTickets, users, createSupportTicket, updateSupportTicket } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = currentUser?.role === 'admin';
  const myTickets = currentUser?.role === 'admin' ? supportTickets : supportTickets.filter(t => t.raisedBy === currentUser?.id);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError('');
    try {
      let attachmentUrl: string | undefined;
      const file = fileRef.current?.files?.[0];
      if (file) attachmentUrl = await uploadFile(`support/${currentUser.id}/${Date.now()}-${file.name}`, file);
      await createSupportTicket({ raisedBy: currentUser.id, page: window.location.pathname, subject, body, priority, attachmentUrl });
      setSubject(''); setBody(''); setPriority('medium'); setShowForm(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError('Unable to submit the ticket. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isImage = (url: string) => /\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(url);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Help Desk</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Support tickets</h1>
          <p className="text-white/60 text-sm mt-1 font-medium">Raise issues and track resolution.</p>
        </div>
      </div>

      <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} />Raise ticket</button>

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">New ticket</h2><button type="button" onClick={() => setShowForm(false)}><XCircle size={18} className="text-slate-400" /></button></div>
          <div className="form-group"><label className="label">Subject</label><input className="input" value={subject} onChange={e => setSubject(e.target.value)} required /></div>
          <div className="form-group"><label className="label">Priority</label><select className="select" value={priority} onChange={e => setPriority(e.target.value as SupportTicket['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="blocking">Blocking</option></select></div>
          <div className="form-group"><label className="label">Description</label><textarea className="input" rows={4} value={body} onChange={e => setBody(e.target.value)} required /></div>
          <div className="form-group"><label className="label">Screenshot or photo <span className="text-slate-400 font-normal">(optional)</span></label><input ref={fileRef} className="input" type="file" accept="image/*,.pdf" /></div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button className="btn-primary" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Submit ticket</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2"><Headphones size={18} className="text-brand-600" /><h2 className="font-black text-slate-900">{canManage ? 'All tickets' : 'My tickets'}</h2></div>
        {myTickets.length === 0 ? <div className="p-10 text-center text-slate-500">No tickets.</div> : <div className="divide-y divide-slate-100">{myTickets.map(ticket => <div key={ticket.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0"><MessageSquare size={14} /></div><div><p className="font-bold text-slate-800">{ticket.subject}</p><p className="text-xs text-slate-500">{formatDateTime(ticket.createdAt)} · Raised by {users.find(u => u.id === ticket.raisedBy)?.name ?? 'Unknown'}</p><p className="text-sm text-slate-600 mt-2">{ticket.body}</p>
          {ticket.attachmentUrl && (
            isImage(ticket.attachmentUrl)
              ? <button type="button" onClick={() => setLightbox(ticket.attachmentUrl!)} className="mt-2 block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity"><img src={ticket.attachmentUrl} alt="Ticket attachment" className="w-24 h-24 object-cover" /></button>
              : <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><Paperclip size={12} />View attachment</a>
          )}
        </div></div><div className="text-right"><span className={`badge ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span></div></div>
          <div className="flex gap-2 mt-3 ml-11">
            {canManage && ticket.status === 'open' && <button onClick={() => updateSupportTicket(ticket.id, { status: 'in_progress' })} className="btn-secondary text-xs py-1">Start</button>}
            {canManage && ticket.status !== 'resolved' && ticket.status !== 'closed' && <button onClick={() => updateSupportTicket(ticket.id, { status: 'resolved' })} className="btn-success text-xs py-1">Resolve</button>}
            {(canManage || ticket.raisedBy === currentUser?.id) && ticket.status !== 'closed' && <button onClick={() => updateSupportTicket(ticket.id, { status: 'closed' })} className="btn-ghost text-xs py-1">Close ticket</button>}
          </div>
        </div>)}</div>}
      </div>
      {lightbox && <Lightbox src={lightbox} alt="Ticket attachment" onClose={() => setLightbox(null)} />}
    </div>
  );
}
