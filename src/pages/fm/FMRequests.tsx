import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Paperclip } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import { formatDate, getSlaStatus } from '../../utils/helpers';
import type { RequestStatus } from '../../types';

export default function FMRequests() {
  const navigate = useNavigate();
  const { currentUser, requests, activeSiteId } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');

  const myRequests = requests.filter(r => r.siteId === siteId);
  const filtered = myRequests.filter(r => {
    const matchSearch = r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_FILTER_OPTS: { value: RequestStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'REQUEST_CREATED', label: 'New' },
    { value: 'PROCUREMENT_REVIEW', label: 'Procurement' },
    { value: 'SUPERVISOR_APPROVAL', label: 'Approval' },
    { value: 'PAYMENT_PENDING', label: 'Payment' },
    { value: 'PAID', label: 'Paid' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">My requests</h1>
          <p className="page-subtitle"><span className="font-bold text-slate-700">{myRequests.length}</span> total · <span className="font-bold text-brand-600">{filtered.length}</span> shown</p>
        </div>
        <button onClick={() => navigate('/fm/request/new')} className="btn-primary">
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by REQ number or description…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-brand-400/30 transition-all placeholder:text-slate-400"
            style={{ background: 'color-mix(in srgb, #4f46e5 5%, #f0f2f7)' }}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-slate-400 flex-shrink-0" />
          {STATUS_FILTER_OPTS.map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`chip ${statusFilter === opt.value ? 'active' : ''}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header rounded-tl-2xl">Request #</th>
              <th className="table-header">Description</th>
              <th className="table-header">Priority</th>
              <th className="table-header">Status</th>
              <th className="table-header">SLA</th>
              <th className="table-header rounded-tr-2xl">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(req => {
              const sla = getSlaStatus(req.slaDeadline, req.status);
              return (
                <tr key={req.id} className="table-row" style={{ borderLeft: `3px solid ${req.priority === 'critical' ? '#ef4444' : req.priority === 'high' ? '#f97316' : req.priority === 'medium' ? '#f59e0b' : '#94a3b8'}` }} onClick={() => navigate(`/request/${req.id}`)}>
                  <td className="table-cell">
                    <span className="font-bold text-brand-600 text-xs font-mono">{req.requestNumber}</span>
                  </td>
                  <td className="table-cell max-w-xs">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const img = (req.attachments ?? []).find(a => /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(a.name) || /\.(png|jpe?g|gif|webp|heic|avif)([?#]|$)/i.test(a.url));
                        return img ? <img src={img.url} alt={img.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0" loading="lazy" /> : null;
                      })()}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{req.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {req.vendorName}
                          {(req.attachments?.length ?? 0) > 0 && <span className="ml-1 inline-flex items-center gap-0.5">· <Paperclip size={10} /> {req.attachments!.length}</span>}
                        </p>
                        {req.status === 'REJECTED' && req.rejectionComment && (
                          <p className="text-xs text-red-600 mt-1 font-medium">Rejected: {req.rejectionComment} — open to resubmit</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell"><PriorityBadge priority={req.priority} /></td>
                  <td className="table-cell"><StatusBadge status={req.status} /></td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold ${sla.color}`}>{sla.label}</span>
                  </td>
                  <td className="table-cell text-xs text-slate-400 whitespace-nowrap">{formatDate(req.createdAt)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-14">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No requests found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
