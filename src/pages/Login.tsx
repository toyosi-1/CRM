import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShoppingCart, CheckSquare, DollarSign, Shield, ArrowRight, Mail, Lock, Loader2, AlertCircle, Wrench } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuth } from '../lib/AuthContext';
import { MOCK_USERS } from '../data/mockData';
import type { UserRole } from '../types';

const ROLE_DEMOS = [
  { userId: 'u1', role: 'facility_manager' as UserRole, label: 'Facility Manager', desc: 'Site operations & requests', icon: <Building2 size={16} />, color: '#7a8c3c' },
  { userId: 'u3', role: 'procurement' as UserRole, label: 'Procurement', desc: 'Vendor & PO management', icon: <ShoppingCart size={16} />, color: '#5a7a3c' },
  { userId: 'u4', role: 'supervisor' as UserRole, label: 'Supervisor', desc: 'Approvals & governance', icon: <CheckSquare size={16} />, color: '#4a6a2c' },
  { userId: 'u5', role: 'finance' as UserRole, label: 'Finance', desc: 'Payments & treasury', icon: <DollarSign size={16} />, color: '#6b7c34' },
  { userId: 'u6', role: 'admin' as UserRole, label: 'System Admin', desc: 'Full system access', icon: <Shield size={16} />, color: '#8a9c44' },
  { userId: 'u7', role: 'technician' as UserRole, label: 'Technician', desc: 'Tasks & job completion', icon: <Wrench size={16} />, color: '#c17a2a' },
];

const ROLE_ROUTES: Record<UserRole, string> = {
  facility_manager: '/fm',
  procurement: '/procurement',
  supervisor: '/supervisor',
  finance: '/finance',
  admin: '/admin',
  ict_admin: '/ict',
  technician: '/technician',
};

export default function Login() {
  const { login: storeLogin } = useStore();
  const { login: supabaseLogin, resetPassword } = useAuth();
  const navigate = useNavigate();

  const demoEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
  const [mode, setMode] = useState<'demo' | 'email'>('email');
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

  const handleDemoLogin = (userId: string, role: UserRole) => {
    storeLogin(userId);
    navigate(ROLE_ROUTES[role]);
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

          {/* Brand logo — full wordmark on the sign-in card */}
          <div className="mb-8">
            <img src="/propel-logo.png" alt="Propel Properties & Facilities Services Ltd." className="h-14 w-auto" />
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-8 w-fit">
            <button onClick={() => setMode('email')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} style={mode === 'email' ? {} : {}}>
              Sign In
            </button>
            {demoEnabled && <button onClick={() => setMode('demo')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'demo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Demo Access
            </button>}
          </div>

          {mode === 'email' ? (
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

              <p className="text-slate-400 text-xs mt-6 text-center">
                No account? Switch to <button onClick={() => setMode('demo')} className="hover:underline" style={{ color: '#7a8c3c' }}>Demo Access</button> to explore.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">Select a role to continue</h1>
              <p className="text-slate-500 text-sm mb-8">Demo environment — choose a role to explore the system.</p>

              <div className="space-y-2">
                {ROLE_DEMOS.map(role => {
                  const user = MOCK_USERS.find(u => u.id === role.userId);
                  return (
                    <button key={role.userId} onClick={() => handleDemoLogin(role.userId, role.role)}
                      className="w-full flex items-center gap-4 px-4 py-3.5 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all duration-150 group text-left" style={{ borderColor: undefined }}>
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-white flex-shrink-0" style={{ background: role.color }}>
                        {role.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800">{role.label}</div>
                        <div className="text-xs text-slate-400">{role.desc}{user ? ` · ${user.name}` : ''}</div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
              </div>

              <p className="text-slate-400 text-xs mt-6 text-center">All data shown is simulated for demonstration purposes.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
