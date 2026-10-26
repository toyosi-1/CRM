import { useState } from 'react';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { login: supabaseLogin, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleResetPassword = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    try {
      await resetPassword(email.trim());
      setNotice('Password reset email sent. Check your inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await supabaseLogin(email, password);
      // AuthContext.onAuthStateChanged will call storeLogin and set currentUser
      // Navigate based on role resolved from Firestore user doc
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const brandPanel = (
    <div className="hidden lg:flex w-80 flex-col justify-between p-10" style={{ background: '#1e2110' }}>
      <div>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
            <img src="/favicon-64.png" alt="" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Propel Works Management Systems</div>
            <div className="text-xs" style={{ color: '#a8cf45' }}>Propel Properties &amp; Facilities Services Ltd</div>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-white leading-snug mb-3">
          Multi-Site Facility Operations
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          End-to-end procurement, maintenance, and financial governance for your facility teams.
        </p>
        <div className="mt-8 space-y-3">
          {['Full audit trail on every request', 'SLA enforcement by priority', 'WHT tax calculation built-in', 'Budget governance per site'].map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7a8c3c' }} />
              <span className="text-slate-400 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-slate-600 text-xs">Propel Works Management Systems · Propel Properties &amp; Facilities Services Ltd</p>
    </div>
  );

  return (
    <div className="h-screen flex overflow-y-auto" style={{ background: '#f4f5f7' }}>
      {brandPanel}

      <div className="flex-1 flex items-center justify-center p-8 min-h-full">
        <div className="w-full max-w-lg">

          {/* Brand logo — full wordmark, white bg blended into the page via multiply */}
          <div className="mb-8">
            <img src="/propel-logo.png" alt="Propel Properties & Facilities Services Ltd." className="h-14 w-auto mix-blend-multiply" />
          </div>

          <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">Welcome back</h1>
              <p className="text-slate-500 text-sm mb-8">Sign in with your FacilityOps account.</p>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {error}
                </div>
              )}
              {notice && <div className="p-3 mb-5 bg-lime-50 border border-lime-200 rounded-lg text-sm text-lime-800">{notice}</div>}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password" required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end"><button type="button" onClick={handleResetPassword} className="text-xs font-medium hover:underline" style={{ color: '#7a8c3c' }}>Forgot password?</button></div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-900 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60" style={{ background: '#a8cf45' }}>
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

          </>
        </div>
      </div>
    </div>
  );
}
