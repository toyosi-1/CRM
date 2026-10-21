import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, FileText, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PriorityBadge } from '../../components/shared/Badges';
import { formatCurrency, formatDate, getSlaStatus } from '../../utils/helpers';

export default function SupervisorApprovals() {
  const navigate = useNavigate();
  const { currentUser, requests, updateRequestStatus } = useStore();

  const queue = requests.filter(r => r.status === 'PO_GENERATED' || r.status === 'SUPERVISOR_APPROVAL');

  const handleApprove = (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation();
    updateRequestStatus(reqId, 'PAYMENT_PENDING', currentUser!.id, 'Supervisor approved. Forwarded to Finance for payment processing.');
  };

  const handleReject = (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation();
    const comment = window.prompt('Enter rejection reason (required):');
    if (!comment?.trim()) return;
    updateRequestStatus(reqId, 'REJECTED', currentUser!.id, 'Request REJECTED by Supervisor.', comment);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Approval queue</h1>
        <p className="page-subtitle">{queue.length} requests awaiting your decision</p>
      </div>

      <div className="space-y-4">
        {queue.map(req => {
          const sla = getSlaStatus(req.slaDeadline, req.status);
          return (
            <div key={req.id} className={`card-hover p-5 border-l-4 ${req.priority === 'critical' ? 'border-l-red-500' : req.priority === 'high' ? 'border-l-orange-500' : req.priority === 'medium' ? 'border-l-amber-400' : 'border-l-slate-300'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-bold text-brand-600">{req.requestNumber}</span>
                    <PriorityBadge priority={req.priority} />
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{req.siteName}</span>
                    {req.isBudgetWarning && (
                      <span className="badge bg-red-100 text-red-700">
                        <AlertTriangle size={9} className="mr-0.5" /> Budget Warning
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-700 mb-3">{req.description}</p>

                  {/* Key details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {req.vendorName && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Vendor</p>
                        <p className="text-sm font-semibold text-slate-700">{req.vendorName}</p>
                      </div>
                    )}
                    {req.invoiceAmount && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Invoice</p>
                        <p className="text-sm font-semibold text-slate-700">{formatCurrency(req.invoiceAmount)}</p>
                      </div>
                    )}
                    {req.purchaseOrder && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">PO Number</p>
                        <div className="flex items-center gap-1">
                          <FileText size={12} className="text-brand-500" />
                          <p className="text-sm font-semibold text-brand-600">{req.purchaseOrder.poNumber}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">SLA</p>
                      <p className={`text-sm font-semibold ${sla.color}`}>{sla.label}</p>
                    </div>
                  </div>

                  {/* Submitted */}
                  <p className="text-xs text-slate-400 mt-3">Submitted {formatDate(req.createdAt)} by {req.submittedByName}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => navigate(`/request/${req.id}`)} className="btn-secondary text-xs py-1.5">
                    <Eye size={13} /> View Full
                  </button>
                  <button onClick={e => handleApprove(e, req.id)} className="btn-success text-xs py-1.5">
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button onClick={e => handleReject(e, req.id)} className="btn-danger text-xs py-1.5">
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {queue.length === 0 && (
          <div className="card p-16 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle size={26} className="text-emerald-500" />
            </div>
            <p className="text-base font-bold text-slate-700">All caught up!</p>
            <p className="text-slate-400 text-sm mt-1">No requests pending approval</p>
          </div>
        )}
      </div>
    </div>
  );
}
