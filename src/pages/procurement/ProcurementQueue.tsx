import { useNavigate } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import { formatCurrency, formatDate, getSlaStatus } from '../../utils/helpers';

export default function ProcurementQueue() {
  const navigate = useNavigate();
  const { currentUser, requests, generatePO, updateRequestStatus } = useStore();

  const queueRequests = requests.filter(r =>
    r.status === 'REQUEST_CREATED' || r.status === 'PROCUREMENT_REVIEW'
  );

  const handleAccept = (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation();
    updateRequestStatus(reqId, 'PROCUREMENT_REVIEW', currentUser!.id, 'Request accepted into Procurement Review queue.');
  };

  const handleGeneratePO = (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation();
    generatePO(reqId, currentUser!.id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Procurement queue</h1>
        <p className="page-subtitle">{queueRequests.length} requests awaiting action</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header">Request</th>
              <th className="table-header">Site</th>
              <th className="table-header">Vendor / invoice</th>
              <th className="table-header">Priority</th>
              <th className="table-header">Status</th>
              <th className="table-header">SLA</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queueRequests.map(req => {
              const sla = getSlaStatus(req.slaDeadline, req.status);
              return (
                <tr key={req.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-bold text-brand-600 text-xs font-mono">{req.requestNumber}</div>
                    <div className="text-xs text-slate-600 max-w-xs truncate font-medium mt-0.5">{req.description.slice(0, 55)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatDate(req.createdAt)}</div>
                  </td>
                  <td className="table-cell text-sm">{req.siteName}</td>
                  <td className="table-cell">
                    {req.vendorName ? (
                      <>
                        <div className="text-sm font-medium text-slate-700">{req.vendorName}</div>
                        <div className="text-xs text-slate-400">{req.invoiceAmount ? formatCurrency(req.invoiceAmount) : 'No invoice'}</div>
                      </>
                    ) : <span className="text-xs text-slate-400">No vendor</span>}
                  </td>
                  <td className="table-cell"><PriorityBadge priority={req.priority} /></td>
                  <td className="table-cell"><StatusBadge status={req.status} /></td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold ${sla.color}`}>{sla.label}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/request/${req.id}`)} className="btn-icon w-7 h-7" title="View">
                        <Eye size={13} />
                      </button>
                      {req.status === 'REQUEST_CREATED' && (
                        <button onClick={e => handleAccept(e, req.id)} className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">Accept</button>
                      )}
                      {req.status === 'PROCUREMENT_REVIEW' && (
                        <button onClick={e => handleGeneratePO(e, req.id)} className="px-2.5 py-1 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 flex items-center gap-1 transition-colors">
                          <FileText size={11} /> Gen PO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {queueRequests.length === 0 && (
              <tr><td colSpan={7}>
                <div className="flex flex-col items-center py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                    <FileText size={20} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Queue is empty</p>
                  <p className="text-xs text-slate-400 mt-1">All requests have been processed</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
