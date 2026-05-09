import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Building2, ShoppingCart, CheckSquare, DollarSign, Shield, ArrowRight, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuth } from '../lib/AuthContext';
import { MOCK_USERS } from '../data/mockData';
import type { UserRole } from '../types';

const ROLE_DEMOS = [
  { userId: 'u1', role: 'facility_manager' as UserRole, label: 'Facility Manager', desc: 'Site operations & requests', icon: <Building2 size={16} />, color: '#0d9488' },
  { userId: 'u3', role: 'procurement' as UserRole, label: 'Procurement', desc: 'Vendor & PO management', icon: <ShoppingCart size={16} />, color: '#3b82f6' },
  { userId: 'u4', role: 'supervisor' as UserRole, label: 'Supervisor', desc: 'Approvals & governance', icon: <CheckSquare size={16} />, color: '#8b5cf6' },
  { userId: 'u5', role: 'finance' as UserRole, label: 'Finance', desc: 'Payments & treasury', icon: <DollarSign size={16} />, color: '#10b981' },
  { userId: 'u6', role: 'admin' as UserRole, label: 'System Admin', desc: 'Full system access', icon: <Shield size={16} />, color: '#6366f1' },
];

const ROLE_ROUTES: Record<UserRole, string> = {
  facility_manager: '/fm',
  procurement: '/procurement',
  supervisor: '/supervisor',
  finance: '/finance',
  admin: '/admin',
};

export default function Login() {
  const { login: storeLogin } = useStore();
  const { login: firebaseLogin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'demo' | 'email'>('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = (userId: string, role: UserRole) => {
    storeLogin(userId);
    navigate(ROLE_ROUTES[role]);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await firebaseLogin(email, password);
      // AuthContext.onAuthStateChanged will call storeLogin and set currentUser
      // Navigate based on role resolved from Firestore user doc
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*?\)\.?/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  const brandPanel = (
    <div className="hidden lg:flex w-80 flex-col justify-between p-10" style={{ background: '#111827' }}>
      <div>
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center">
            <Zap size={14} className="text-white" fill="currentColor" />
          </div>
          <span className="text-white font-semibold text-sm">FacilityOps</span>
        </div>
        <h2 className="text-2xl font-semibold text-white leading-snug mb-3">
          Multi-Site Facility Operations
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          End-to-end procurement, maintenance, and financial governance for enterprise facility teams.
        </p>
        <div className="mt-8 space-y-3">
          {['Full audit trail on every request', 'SLA enforcement by priority', 'WHT tax calculation built-in', 'Budget governance per site'].map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-slate-400 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-slate-600 text-xs">v2.0 · Enterprise</p>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#f4f5f7' }}>
      {brandPanel}

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" fill="currentColor" />
            </div>
            <span className="text-slate-900 font-semibold text-sm">FacilityOps</span>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-8 w-fit">
            <button onClick={() => setMode('email')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Sign In
            </button>
            <button onClick={() => setMode('demo')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'demo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Demo Access
            </button>
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
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p className="text-slate-400 text-xs mt-6 text-center">
                No account? Switch to <button onClick={() => setMode('demo')} className="text-indigo-600 hover:underline">Demo Access</button> to explore.
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
                      className="w-full flex items-center gap-4 px-4 py-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all duration-150 group text-left">
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
