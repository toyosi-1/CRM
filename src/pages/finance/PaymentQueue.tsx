import { useNavigate } from 'react-router-dom';
import { DollarSign, Eye, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PriorityBadge, StatusBadge } from '../../components/shared/Badges';
import { formatCurrency, getSlaStatus, TAX_LABELS } from '../../utils/helpers';
import type { TaxType } from '../../types';

export default function PaymentQueue() {
  const navigate = useNavigate();
  const { currentUser, requests, processPayment, markPaid } = useStore();

  const queue = requests.filter(r => r.status === 'PAYMENT_PENDING' || r.status === 'ADMIN_APPROVED');
  const handleApplyTax = (reqId: string, taxType: TaxType) => {
    processPayment(reqId, taxType, currentUser!.id);
  };

  const handleMarkPaid = (reqId: string) => {
    markPaid(reqId, currentUser!.id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Payment Queue</h1>
        <p className="page-subtitle">{queue.length} requests pending payment processing</p>
      </div>

      <div className="space-y-4">
        {queue.map(req => {
          const sla = getSlaStatus(req.slaDeadline, req.status);
          const hasTax = !!req.taxType;

          return (
            <div key={req.id} className={`card-hover p-5 ${req.isEmergencyBypass ? 'border-purple-300 bg-purple-50/30' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-bold text-brand-600">{req.requestNumber}</span>
                    <PriorityBadge priority={req.priority} />
                    <StatusBadge status={req.status} />
                    <span className={`text-xs font-semibold ${sla.color}`}>{sla.label}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 truncate max-w-lg">{req.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Vendor</p>
                      <p className="font-semibold text-slate-700">{req.vendorName ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Gross Amount</p>
                      <p className="font-semibold text-slate-700">{formatCurrency(req.invoiceAmount ?? 0)}</p>
                    </div>
                    {hasTax && (
                      <>
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Tax ({TAX_LABELS[req.taxType!]})</p>
                          <p className="font-semibold text-red-600">- {formatCurrency(req.taxAmount ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Net Payable</p>
                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(req.netPayment ?? 0)}</p>
                        </div>
                      </>
                    )}
                    {req.purchaseOrder && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">PO Number</p>
                        <p className="font-semibold text-brand-600">{req.purchaseOrder.poNumber}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Site</p>
                      <p className="font-semibold text-slate-700">{req.siteName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0 min-w-36">
                  <button onClick={() => navigate(`/request/${req.id}`)} className="btn-secondary text-xs py-1.5">
                    <Eye size={12} /> View Dossier
                  </button>
                  {!hasTax && (
                    <>
                      <button onClick={() => handleApplyTax(req.id, '5pct_wht')} className="text-xs py-1.5 px-3 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 font-semibold transition-colors">
                        Apply 5% WHT
                      </button>
                      <button onClick={() => handleApplyTax(req.id, '10pct_wht')} className="text-xs py-1.5 px-3 rounded-lg bg-orange-100 text-orange-800 hover:bg-orange-200 font-semibold transition-colors">
                        Apply 10% WHT
                      </button>
                      <button onClick={() => handleApplyTax(req.id, 'exempt')} className="text-xs py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition-colors">
                        Tax Exempt
                      </button>
                    </>
                  )}
                  {hasTax && (
                    <button onClick={() => handleMarkPaid(req.id)} className="btn-success text-xs py-1.5">
                      <CheckCircle size={12} /> Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {queue.length === 0 && (
          <div className="card p-16 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <DollarSign size={26} className="text-emerald-500" />
            </div>
            <p className="text-base font-bold text-slate-700">No pending payments</p>
            <p className="text-slate-400 text-sm mt-1">All payments have been processed</p>
          </div>
        )}
      </div>
    </div>
  );
}
