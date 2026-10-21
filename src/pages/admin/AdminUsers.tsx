import { useMemo, useState, type FormEvent } from 'react';
import { Loader2, Mail, Pencil, ShieldCheck, UserPlus, Users, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fetchUsers, inviteStaff, updateStaff } from '../../lib/db';
import type { User, UserRole } from '../../types';

const ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'facility_manager', label: 'Facility Manager' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'finance', label: 'Finance' },
  { value: 'technician', label: 'Technician' },
  { value: 'admin', label: 'Administrator' },
  { value: 'ict_admin', label: 'ICT Admin' },
];

// Only the executive admin may create or modify admin-level accounts.
const EXECUTIVE_ROLES: UserRole[] = ['admin', 'ict_admin'];

export default function AdminUsers() {
  const { currentUser, users, sites } = useStore();
  const roleOptions = currentUser?.role === 'admin' ? ROLES : ROLES.filter(r => !EXECUTIVE_ROLES.includes(r.value));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('facility_manager');
  const [siteId, setSiteId] = useState('');
  const [trade, setTrade] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [editSiteIds, setEditSiteIds] = useState<string[]>([]);
  const activeUsers = useMemo(() => users.filter(user => user.active !== false), [users]);
  const inactiveUsers = useMemo(() => users.filter(user => user.active === false), [users]);

  const openEdit = (user: User) => {
    setEditing(user);
    setEditSiteIds(user.siteIds?.length ? [...user.siteIds] : user.siteId ? [user.siteId] : []);
    setMessage(null);
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const f = event.currentTarget.elements as unknown as Record<string, HTMLInputElement | HTMLSelectElement>;
    const newRole = f.editRole.value as UserRole;
    setSaving(true);
    try {
      const text = await updateStaff({
        profileId: editing.id, name: f.editName.value, phone: f.editPhone.value,
        trade: newRole === 'technician' ? f.editTrade?.value ?? '' : '',
        role: newRole, siteId: editSiteIds[0] ?? null, siteIds: editSiteIds,
        department: ROLES.find(r => r.value === newRole)?.label ?? newRole,
        active: (f.editActive as HTMLInputElement).checked,
      });
      const refreshed = await fetchUsers();
      useStore.setState({ users: refreshed });
      setEditing(null);
      setMessage({ type: 'success', text });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to update staff member.' });
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (role === 'facility_manager' && !siteId) {
      setMessage({ type: 'error', text: 'Select a facility for this manager.' });
      return;
    }
    setSaving(true);
    try {
      const text = await inviteStaff({
        name, email, phone, role,
        siteId: siteId || undefined,
        department: ROLES.find(item => item.value === role)?.label ?? role,
        trade: role === 'technician' ? trade : '',
      });
      const refreshed = await fetchUsers();
      useStore.setState({ users: refreshed });
      setName(''); setEmail(''); setPhone(''); setSiteId(''); setTrade('');
      setMessage({ type: 'success', text });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to invite staff member.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Administration</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Staff access</h1>
            <p className="text-white/60 text-sm mt-1 font-medium">Invite staff and assign role-based access.</p>
          </div>
          <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10">
            <p className="text-2xl font-black text-white">{activeUsers.length}</p>
            <p className="text-white/60 text-[11px] font-semibold">Active Staff</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <form onSubmit={submit} className="card p-5 xl:col-span-2 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><UserPlus size={17} /></div>
            <div><h2 className="font-black text-slate-900">Invite staff member</h2><p className="text-xs text-slate-500">They will receive a secure password setup link.</p></div>
          </div>
          <div className="form-group"><label className="label" htmlFor="staff-name">Full name</label><input id="staff-name" className="input" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="form-group"><label className="label" htmlFor="staff-email">Work email</label><input id="staff-email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group"><label className="label" htmlFor="staff-role">Role</label><select id="staff-role" className="select" value={role} onChange={e => setRole(e.target.value as UserRole)}>{roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <div className="form-group"><label className="label" htmlFor="staff-phone">Phone</label><input id="staff-phone" className="input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          </div>
          {role === 'technician' && <div className="form-group"><label className="label" htmlFor="staff-trade">Trade / specialty</label><input id="staff-trade" className="input" placeholder="e.g. Electrical, HVAC, Plumbing" value={trade} onChange={e => setTrade(e.target.value)} required /></div>}
          {(role === 'facility_manager' || role === 'technician') && <div className="form-group"><label className="label" htmlFor="staff-site">Facility</label><select id="staff-site" className="select" value={siteId} onChange={e => setSiteId(e.target.value)} required><option value="">Select facility</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select>{sites.length === 0 && <p className="text-xs text-amber-700">Create a facility before inviting this role.</p>}</div>}
          {message && <div role="status" className={`rounded-lg px-3 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
          <button className="btn-primary w-full justify-center" disabled={saving || ((role === 'facility_manager' || role === 'technician') && sites.length === 0)}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}Send secure invitation</button>
        </form>

        <div className="card xl:col-span-3 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3"><Users size={18} className="text-brand-600" /><div><h2 className="font-black text-slate-900">Staff directory</h2><p className="text-xs text-slate-500">Accounts provisioned for ERP access</p></div></div>
          {activeUsers.length === 0 ? <div className="p-10 text-center"><ShieldCheck size={28} className="mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-600">No staff accounts yet</p><p className="text-xs text-slate-400 mt-1">Invited staff will appear here.</p></div> : <div className="divide-y divide-slate-100">{activeUsers.map(user => (
            <div key={user.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div><span className="badge bg-brand-50 text-brand-700">{ROLES.find(item => item.value === user.role)?.label ?? user.role}</span><p className="text-[11px] text-slate-400 mt-1">{(user.siteIds?.length ? user.siteIds : user.siteId ? [user.siteId] : []).map(id => sites.find(s => s.id === id)?.name).filter(Boolean).join(', ') || user.department}</p></div>
                {(currentUser?.role === 'admin' || !EXECUTIVE_ROLES.includes(user.role)) && (
                  <button onClick={() => openEdit(user)} className="btn-secondary !py-1 !px-2 text-xs"><Pencil size={12} />Edit</button>
                )}
              </div>
            </div>))}
          </div>}
          {inactiveUsers.length > 0 && (
            <div className="border-t border-slate-100">
              <p className="px-5 pt-4 pb-1 text-[10px] font-bold tracking-widest text-slate-400">DEACTIVATED</p>
              {inactiveUsers.map(user => (
                <div key={user.id} className="px-5 py-3 flex items-center justify-between gap-3 opacity-60">
                  <div className="min-w-0"><p className="text-sm font-bold text-slate-600 truncate">{user.name}</p><p className="text-xs text-slate-400 truncate">{user.email}</p></div>
                  <button onClick={() => openEdit(user)} className="btn-secondary !py-1 !px-2 text-xs">Reactivate</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <form onSubmit={submitEdit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900">Edit {editing.name}</h2>
            <button type="button" onClick={() => setEditing(null)}><XCircle size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="form-group"><label className="label" htmlFor="edit-name">Full name</label><input id="edit-name" name="editName" className="input" defaultValue={editing.name} required /></div>
            <div className="form-group"><label className="label" htmlFor="edit-phone">Phone</label><input id="edit-phone" name="editPhone" className="input" defaultValue={editing.phone} /></div>
            <div className="form-group"><label className="label" htmlFor="edit-role">Role</label><select id="edit-role" name="editRole" className="select" defaultValue={editing.role}>{roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            <div className="form-group"><label className="label" htmlFor="edit-trade">Trade / specialty</label><input id="edit-trade" name="editTrade" className="input" defaultValue={editing.trade} placeholder="Technicians only" /></div>
          </div>
          <div className="form-group">
            <p className="label">Facility assignments</p>
            <div className="flex flex-wrap gap-2">
              {sites.map(site => (
                <label key={site.id} className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${editSiteIds.includes(site.id) ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-slate-200 text-slate-500'}`}>
                  <input type="checkbox" className="hidden" checked={editSiteIds.includes(site.id)} onChange={e => setEditSiteIds(e.target.checked ? [...editSiteIds, site.id] : editSiteIds.filter(id => id !== site.id))} />
                  {site.name}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Only applies to facility managers and technicians — the first selected facility is their primary site.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input name="editActive" type="checkbox" className="w-4 h-4" defaultChecked={editing.active !== false} />Account active</label>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      )}
    </div>
  );
}
