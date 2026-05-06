import { useNavigate } from 'react-router-dom';
import { Zap, Building2, ShoppingCart, CheckSquare, DollarSign, Shield, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MOCK_USERS } from '../data/mockData';
import type { UserRole } from '../types';

const ROLE_DEMOS = [
  {
    userId: 'u1', role: 'facility_manager' as UserRole,
    label: 'Facility Manager', desc: 'Lagos Head Office',
    icon: <Building2 size={22} />,
    gradient: 'from-teal-500 to-cyan-600',
    glow: 'shadow-[0_0_20px_rgba(20,184,166,0.4)]',
    border: 'hover:border-teal-500/40',
    dot: 'bg-teal-400',
  },
  {
    userId: 'u3', role: 'procurement' as UserRole,
    label: 'Procurement', desc: 'Cost Auditor',
    icon: <ShoppingCart size={22} />,
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    border: 'hover:border-blue-500/40',
    dot: 'bg-blue-400',
  },
  {
    userId: 'u4', role: 'supervisor' as UserRole,
    label: 'Supervisor', desc: 'Governance Layer',
    icon: <CheckSquare size={22} />,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.4)]',
    border: 'hover:border-violet-500/40',
    dot: 'bg-violet-400',
  },
  {
    userId: 'u5', role: 'finance' as UserRole,
    label: 'Finance', desc: 'Disbursement Authority',
    icon: <DollarSign size={22} />,
    gradient: 'from-emerald-500 to-green-600',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
    border: 'hover:border-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  {
    userId: 'u6', role: 'admin' as UserRole,
    label: 'Admin', desc: 'System Controller',
    icon: <Shield size={22} />,
    gradient: 'from-brand-500 to-purple-700',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.4)]',
    border: 'hover:border-brand-500/40',
    dot: 'bg-brand-400',
  },
];

const ROLE_ROUTES: Record<UserRole, string> = {
  facility_manager: '/fm',
  procurement: '/procurement',
  supervisor: '/supervisor',
  finance: '/finance',
  admin: '/admin',
};

export default function Login() {
  const { login } = useStore();
  const navigate = useNavigate();
  const handleLogin = (userId: string, role: UserRole) => {
    login(userId);
    navigate(ROLE_ROUTES[role]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'linear-gradient(145deg, #080d1a 0%, #0d1529 40%, #111827 70%, #0a0e1a 100%)' }}>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 animate-float"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)', animationDelay: '0s' }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 animate-float"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="w-full max-w-4xl relative z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-3xl animate-glow-pulse" />
            <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-glow-brand"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)' }}>
              <Zap size={32} className="text-white" fill="currentColor" />
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">
            FacilityOps
          </h1>
          <p className="text-slate-400 text-lg font-medium">Multi-Site Facility Operations & Procurement Platform</p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {['Multi-Site Management', 'Full Audit Trail', 'Financial Governance', 'SLA Tracking'].map(f => (
              <span key={f} className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Role selector panel */}
        <div className="rounded-3xl p-7 border"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }} />
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Select Demo Role</p>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ROLE_DEMOS.map(role => {
              const user = MOCK_USERS.find(u => u.id === role.userId);
              return (
                <button
                  key={role.userId}
                  onClick={() => handleLogin(role.userId, role.role)}
                  className={`group relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 active:scale-95 ${role.border}`}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${role.gradient} text-white shadow-lg group-hover:${role.glow} transition-all duration-300`}>
                    {role.icon}
                  </div>
                  {/* Labels */}
                  <div className="text-center">
                    <div className="text-white font-bold text-sm leading-tight">{role.label}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{role.desc}</div>
                    {user && (
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${role.dot}`} />
                        <span className="text-slate-500 text-[10px] font-medium truncate max-w-[80px]">{user.name.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                  {/* Hover arrow */}
                  <ArrowRight size={12} className="absolute top-3 right-3 text-white/0 group-hover:text-white/40 transition-all duration-200" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-slate-600 text-xs">FacilityOps Enterprise v2.0 · Demo Environment · All data is simulated</p>
        </div>
      </div>
    </div>
  );
}
