import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import { formatCurrency, getSlaStatus } from '../../utils/helpers';
import type { RequestStatus } from '../../types';

export default function AdminRequests() {
  const navigate = useNavigate();
  const { currentUser, requests, updateRequestStatus } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const { sites } = useStore();

  const filtered = requests.filter(r => {
    const matchSearch = r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.submittedByName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSite = siteFilter === 'all' || r.siteId === siteFilter;
    return matchSearch && matchStatus && matchSite;
  });

  const handleEmergencyBypass = (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation();
    updateRequestStatus(reqId, 'ADMIN_APPROVED', currentUser!.id, '⚡ EMERGENCY BYPASS ACTIVATED — Admin override applied. Routed directly to Payment Pending.');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">All Requests</h1>
        <p className="page-subtitle">{requests.length} total across all sites · {filtered.length} matching filters</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as RequestStatus | 'all')} className="input max-w-44">
          <option value="all">All Statuses</option>
          <option value="REQUEST_CREATED">New</option>
          <option value="PROCUREMENT_REVIEW">Procurement</option>
          <option value="PO_GENERATED">PO Generated</option>
          <option value="SUPERVISOR_APPROVAL">Awaiting Approval</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="PAID">Paid</option>
          <option value="REJECTED">Rejected</option>
          <option value="ADMIN_APPROVED">Admin Approved</option>
        </select>
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="input max-w-44">
          <option value="all">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header">Request</th>
              <th className="table-header">Site</th>
              <th className="table-header">Submitted By</th>
              <th className="table-header">Priority</th>
              <th className="table-header">Status</th>
              <th className="table-header">Amount</th>
              <th className="table-header">SLA</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(req => {
              const sla = getSlaStatus(req.slaDeadline, req.status);
              return (
                <tr key={req.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-brand-600">{req.requestNumber}</span>
                      {req.isEmergencyBypass && <Zap size={12} className="text-purple-500" />}
                    </div>
                    <p className="text-xs text-slate-400 max-w-48 truncate">{req.description.slice(0, 50)}</p>
                  </td>
                  <td className="table-cell text-sm">{req.siteName}</td>
                  <td className="table-cell text-sm">{req.submittedByName}</td>
                  <td className="table-cell"><PriorityBadge priority={req.priority} /></td>
                  <td className="table-cell"><StatusBadge status={req.status} /></td>
                  <td className="table-cell text-sm font-semibold">{req.invoiceAmount ? formatCurrency(req.invoiceAmount) : '—'}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold ${sla.color}`}>{sla.label}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/request/${req.id}`)} className="btn-icon w-7 h-7">
                        <Eye size={13} />
                      </button>
                      {req.status === 'REQUEST_CREATED' && (
                        <button onClick={e => handleEmergencyBypass(e, req.id)} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 flex items-center gap-1 transition-colors">
                          <Zap size={10} /> Bypass
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8}>
                <div className="flex flex-col items-center py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No matching requests</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
