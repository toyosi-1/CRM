import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ExternalLink, Shield } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { RoleBadge } from '../../components/shared/Badges';
import { formatDate } from '../../utils/helpers';
import type { UserRole } from '../../types';

export default function AdminAuditLog() {
  const navigate = useNavigate();
  const { requests } = useStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const allEntries = requests
    .flatMap(r => r.auditTrail.map(e => ({ ...e, requestNumber: r.requestNumber, siteName: r.siteName })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filtered = allEntries.filter(e => {
    const matchSearch =
      e.userName.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.requestNumber.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || e.userRole === roleFilter;
    return matchSearch && matchRole;
  });

  const ROLE_OPTS: { value: UserRole | 'all'; label: string }[] = [
    { value: 'all', label: 'All Roles' },
    { value: 'facility_manager', label: 'FM' },
    { value: 'procurement', label: 'Procurement' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'finance', label: 'Finance' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Full Audit Log</h1>
          <p className="page-subtitle">{allEntries.length} immutable entries · All actions permanently recorded</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold shadow-sm">
          <Shield size={12} className="text-emerald-400" />
          <span>Tamper-proof</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user, action, request..." className="input pl-9" />
        </div>
        <div className="flex gap-1.5">
          {ROLE_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${roleFilter === opt.value ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header">Timestamp</th>
              <th className="table-header">User</th>
              <th className="table-header">Role</th>
              <th className="table-header">Request</th>
              <th className="table-header">Action</th>
              <th className="table-header">TAT</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(entry => (
              <tr key={entry.id} className="table-row">
                <td className="table-cell text-xs text-slate-500 whitespace-nowrap">
                  {formatDate(entry.timestamp)}
                </td>
                <td className="table-cell">
                  <div className="text-sm font-semibold text-slate-800">{entry.userName}</div>
                  <div className="text-xs text-slate-400">{entry.department}</div>
                </td>
                <td className="table-cell"><RoleBadge role={entry.userRole} /></td>
                <td className="table-cell">
                  <div className="text-xs font-semibold text-brand-600">{entry.requestNumber}</div>
                  <div className="text-xs text-slate-400">{entry.siteName}</div>
                </td>
                <td className="table-cell max-w-xs">
                  <p className="text-sm text-slate-700 truncate">{entry.action}</p>
                  {entry.comment && (
                    <p className="text-xs text-amber-600 truncate">{entry.comment}</p>
                  )}
                </td>
                <td className="table-cell">
                  {entry.tatHours && entry.tatHours > 0 ? (
                    <span className={`badge ${entry.tatHours < 24 ? 'bg-emerald-100 text-emerald-700' : entry.tatHours < 72 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {entry.tatHours}h
                    </span>
                  ) : <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="table-cell">
                  <button onClick={() => navigate(`/request/${entry.requestId}`)} className="btn-icon w-7 h-7">
                    <ExternalLink size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100 text-center">
            Showing 100 of {filtered.length} entries. Use filters to narrow results.
          </div>
        )}
      </div>
    </div>
  );
}
