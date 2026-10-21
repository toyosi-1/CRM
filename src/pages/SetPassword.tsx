import { useState, type FormEvent } from 'react';
import { CheckCircle, Loader2, Lock } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function SetPassword() {
  const { supabaseUser, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  if (loading) return <div className="h-screen overflow-y-auto grid place-items-center"><Loader2 className="animate-spin text-brand-600" /></div>;
  if (!supabaseUser && !complete) return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) return setError(updateError.message);
      setComplete(true);
    } catch {
      setError('Could not update your password — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="h-screen overflow-y-auto bg-slate-50 grid place-items-center p-4"><div className="card p-7 w-full max-w-md">{complete ? <div className="text-center"><CheckCircle size={40} className="mx-auto text-emerald-600 mb-3" /><h1 className="text-xl font-black text-slate-900">Password updated</h1><p className="text-sm text-slate-500 mt-2">Your new password is now active.</p><button className="btn-primary mt-5" onClick={() => navigate('/')}>Continue to Propel Works</button></div> : <form onSubmit={submit} className="space-y-4"><div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Lock size={20} /></div><div><h1 className="text-xl font-black text-slate-900">Set a new password</h1><p className="text-sm text-slate-500 mt-1">Enter a new password for your account.</p></div><div className="form-group"><label className="label" htmlFor="new-password">New password</label><input id="new-password" className="input" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required /></div><div className="form-group"><label className="label" htmlFor="confirm-password">Confirm password</label><input id="confirm-password" className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>{error && <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}<button className="btn-primary w-full justify-center" disabled={saving}>{saving && <Loader2 size={15} className="animate-spin" />}Save password</button></form>}</div></main>;
}
