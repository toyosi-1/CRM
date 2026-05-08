import { useNavigate } from 'react-router-dom';
import { Zap, Building2, ShoppingCart, CheckSquare, DollarSign, Shield, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MOCK_USERS } from '../data/mockData';
import type { UserRole } from '../types';

const ROLE_DEMOS = [
  {
    userId: 'u1', role: 'facility_manager' as UserRole,
    label: 'Facility Manager', desc: 'Site operations & requests',
    icon: <Building2 size={16} />, color: '#0d9488',
  },
  {
    userId: 'u3', role: 'procurement' as UserRole,
    label: 'Procurement', desc: 'Vendor & PO management',
    icon: <ShoppingCart size={16} />, color: '#3b82f6',
  },
  {
    userId: 'u4', role: 'supervisor' as UserRole,
    label: 'Supervisor', desc: 'Approvals & governance',
    icon: <CheckSquare size={16} />, color: '#8b5cf6',
  },
  {
    userId: 'u5', role: 'finance' as UserRole,
    label: 'Finance', desc: 'Payments & treasury',
    icon: <DollarSign size={16} />, color: '#10b981',
  },
  {
    userId: 'u6', role: 'admin' as UserRole,
    label: 'System Admin', desc: 'Full system access',
    icon: <Shield size={16} />, color: '#6366f1',
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
    <div className="min-h-screen flex" style={{ background: '#f4f5f7' }}>

      {/* Left brand panel */}
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
        <p className="text-slate-600 text-xs">v2.0 · Demo Environment</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" fill="currentColor" />
            </div>
            <span className="text-slate-900 font-semibold text-sm">FacilityOps</span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900 mb-1">Select a role to continue</h1>
          <p className="text-slate-500 text-sm mb-8">This is a demo environment. Choose a role to explore the system.</p>

          <div className="space-y-2">
            {ROLE_DEMOS.map(role => {
              const user = MOCK_USERS.find(u => u.id === role.userId);
              return (
                <button
                  key={role.userId}
                  onClick={() => handleLogin(role.userId, role.role)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all duration-150 group text-left"
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: role.color }}>
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
        </div>
      </div>
    </div>
  );
}
