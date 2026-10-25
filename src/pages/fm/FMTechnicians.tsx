import { useMemo, useState, type FormEvent } from 'react';
import { Loader2, UserPlus, Pencil, Wrench, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fetchUsers, createStaff, updateStaff } from '../../lib/db';
import type { User } from '../../types';

export default function FMTechnicians() {
  const { users, currentUser, sites, activeSiteId } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState('');
  const [password, setPassword] = useState('p@55w0rd');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTrade, setEditTrade] = useState('');

  const [pickedSiteId, setPickedSiteId] = useState('');
  const canPickSite = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
  const defaultSiteId = activeSiteId ?? currentUser?.siteId ?? sites[0]?.id;
  const siteId = canPickSite && pickedSiteId ? pickedSiteId : defaultSiteId;
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
  const siteName = sites.find(site => site.id === siteId)?.name ?? 'your facility';
  const technicians = useMemo(
    () => users.filter(user => user.role === 'technician' && (user.siteIds?.includes(siteId ?? '') || user.siteId === siteId)),
    [users, siteId],
  );

  const refresh = async () => useStore.setState({ users: await fetchUsers() });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!siteId) {
      setMessage({ type: 'error', text: 'Your account is not assigned to a facility.' });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      const text = await createStaff({ name, email, phone, role: 'technician', siteId, department: 'Technician', trade, password, notes });
      await refresh();
      setName(''); setEmail(''); setPhone(''); setTrade(''); setPassword('p@55w0rd'); setNotes('');
      setMessage({ type: 'success', text });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to create technician.' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user: User) => {
    setEditing(user);
    setEditName(user.name);
    setEditPhone(user.phone ?? '');
    setEditTrade(user.trade ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const text = await updateStaff({ profileId: editing.id, name: editName, phone: editPhone, trade: editTrade });
      await refresh();
      setEditing(null);
      setMessage({ type: 'success', text });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to update technician.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    setSaving(true);
    try {
      const text = await updateStaff({ profileId: user.id, active: user.active === false });
      await refresh();
      setMessage({ type: 'success', text });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to update technician.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Facility Team</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Technicians</h1>
            <p className="text-white/60 text-sm mt-1 font-medium">{canManage ? `Create and manage technicians for ${siteName}.` : `Technicians assigned to ${siteName}.`}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10">
            <p className="text-2xl font-black text-white">{technicians.filter(t => t.active !== false).length}</p>
            <p className="text-white/60 text-[11px] font-semibold">Active Technicians</p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${canManage ? 'xl:grid-cols-5' : ''} gap-5`}>
        {canManage && <form onSubmit={submit} className="card p-5 xl:col-span-2 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><UserPlus size={17} /></div>
            <div><h2 className="font-black text-slate-900">Create technician</h2><p className="text-xs text-slate-500">Account is created immediately — no email is sent.</p></div>
          </div>
          <div className="form-group"><label className="label" htmlFor="tech-name">Full name</label><input id="tech-name" className="input" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="form-group"><label className="label" htmlFor="tech-email">Work email</label><input id="tech-email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group"><label className="label" htmlFor="tech-phone">Phone</label><input id="tech-phone" className="input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div className="form-group"><label className="label" htmlFor="tech-trade">Trade / specialty</label><input id="tech-trade" className="input" placeholder="e.g. Electrical, HVAC" value={trade} onChange={e => setTrade(e.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group"><label className="label" htmlFor="tech-password">Password</label><input id="tech-password" className="input" type="text" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <div className="form-group"><label className="label" htmlFor="tech-notes">Notes</label><input id="tech-notes" className="input" placeholder="Internal note" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          {canPickSite ? (
            <div className="form-group"><label className="label" htmlFor="tech-site">Facility</label>
              <select id="tech-site" className="input" value={siteId ?? ''} onChange={e => setPickedSiteId(e.target.value)}>
                {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Technicians are assigned to <span className="font-semibold text-slate-700">{siteName}</span> automatically.</p>
          )}
          {message && <div role="status" className={`rounded-lg px-3 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
          <button className="btn-primary w-full justify-center" disabled={saving || !siteId}>{saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}Create technician account</button>
        </form>}

        <div className="card xl:col-span-3 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3"><Wrench size={18} className="text-brand-600" /><div><h2 className="font-black text-slate-900">Facility technicians</h2><p className="text-xs text-slate-500">Technicians assigned to {siteName}</p></div></div>
          {technicians.length === 0 ? (
            <div className="p-10 text-center"><Wrench size={28} className="mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-600">No technicians yet</p><p className="text-xs text-slate-400 mt-1">Created technicians will appear here.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {technicians.map(tech => (
                <div key={tech.id} className="p-4">
                  {editing?.id === tech.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="form-group"><label className="label">Name</label><input className="input" value={editName} onChange={e => setEditName(e.target.value)} required /></div>
                        <div className="form-group"><label className="label">Phone</label><input className="input" value={editPhone} onChange={e => setEditPhone(e.target.value)} /></div>
                        <div className="form-group"><label className="label">Trade / specialty</label><input className="input" value={editTrade} onChange={e => setEditTrade(e.target.value)} /></div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="button" className="btn-ghost text-xs" onClick={() => setEditing(null)}><X size={13} /> Cancel</button>
                        <button type="button" className="btn-primary text-xs px-4" disabled={saving} onClick={saveEdit}>{saving && <Loader2 size={13} className="animate-spin" />}Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{tech.name}</p>
                        <p className="text-xs text-slate-500 truncate">{tech.email}{tech.trade ? ` · ${tech.trade}` : ''}{tech.phone ? ` · ${tech.phone}` : ''}</p>
                        {tech.notes && <p className="text-xs text-slate-400 truncate">{tech.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge ${tech.active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                          {tech.active === false ? 'Inactive' : 'Active'}
                        </span>
                        {canManage && <>
                          <button type="button" onClick={() => toggleActive(tech)} disabled={saving} className="btn-ghost text-xs text-slate-500">
                            {tech.active === false ? 'Activate' : 'Deactivate'}
                          </button>
                          <button type="button" onClick={() => startEdit(tech)} className="btn-ghost text-xs text-slate-500"><Pencil size={12} /> Edit</button>
                        </>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
