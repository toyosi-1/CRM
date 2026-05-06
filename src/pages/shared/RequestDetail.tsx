import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Building2, User, AlertTriangle, CheckCircle, XCircle, DollarSign, Zap, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import AuditTimeline from '../../components/shared/AuditTimeline';
import BudgetWidget from '../../components/shared/BudgetWidget';
import {
  formatCurrency, formatDateTime, formatDate,
  getSlaStatus, TAX_LABELS
} from '../../utils/helpers';

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, sites, vendors, currentUser, updateRequestStatus, generatePO, processPayment, markPaid } = useStore();

  const req = requests.find(r => r.id === id);
  const site = req ? sites.find(s => s.id === req.siteId) : null;
  const vendor = req?.vendorId ? vendors.find(v => v.id === req.vendorId) : null;
  const budgetSum = site ? {
    budget: site.monthlyBudget,
    spent: site.currentMonthSpend,
    remaining: site.monthlyBudget - site.currentMonthSpend,
    utilizationPct: Math.round((site.currentMonthSpend / site.monthlyBudget) * 100),
  } : null;

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <FileText size={20} className="text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-600">Request not found</p>
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs"><ArrowLeft size={12} /> Go back</button>
      </div>
    );
  }

  const slaStatus = getSlaStatus(req.slaDeadline, req.status);
  const role = currentUser?.role;

  const handleApprove = () => {
    updateRequestStatus(req.id, 'PAYMENT_PENDING', currentUser!.id, 'Supervisor approved request. Forwarded to Finance for payment.');
    navigate(-1);
  };

  const handleReject = () => {
    const comment = window.prompt('Enter rejection reason:');
    if (!comment) return;
    updateRequestStatus(req.id, 'REJECTED', currentUser!.id, 'Request REJECTED.', comment);
    navigate(-1);
  };

  const handleGeneratePO = () => {
    generatePO(req.id, currentUser!.id);
  };

  const handleMoveToProcurement = () => {
    updateRequestStatus(req.id, 'PROCUREMENT_REVIEW', currentUser!.id, 'Request accepted into Procurement Review queue.');
  };

  const handleProcessPayment = (taxType: '5pct_wht' | '10pct_wht' | 'exempt') => {
    processPayment(req.id, taxType, currentUser!.id);
  };

  const handleMarkPaid = () => {
    markPaid(req.id, currentUser!.id);
    navigate(-1);
  };

  const handleEmergencyBypass = () => {
    updateRequestStatus(req.id, 'ADMIN_APPROVED', currentUser!.id, '⚡ EMERGENCY BYPASS ACTIVATED — Admin override. Routed directly to Payment Pending.');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-icon">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{req.requestNumber}</h1>
            <StatusBadge status={req.status} />
            <PriorityBadge priority={req.priority} />
            {req.isEmergencyBypass && (
              <span className="badge bg-purple-100 text-purple-700">
                <span className="badge-dot bg-purple-500" /><Zap size={9} className="mr-0.5" /> Bypass
              </span>
            )}
            {req.isBudgetWarning && (
              <span className="badge bg-red-100 text-red-700">
                <span className="badge-dot bg-red-500" /><AlertTriangle size={9} className="mr-0.5" /> Budget Warning
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{req.siteName} · Submitted {formatDate(req.createdAt)}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${slaStatus.color}`}>
          <Clock size={13} />
          {slaStatus.label}
        </div>
      </div>

      {/* Main 2-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Request Dossier */}
        <div className="lg:col-span-3 space-y-4">

          {/* Description */}
          <div className="card p-5">
            <h2 className="section-title mb-3">Fault Description</h2>
            <p className="text-slate-700 leading-relaxed">{req.description}</p>
            {req.faultPhotoUrl && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FileText size={14} />
                  <span>Fault photo attached</span>
                </div>
              </div>
            )}
          </div>

          {/* Site & Asset */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Site & Asset Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={14} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{req.siteName}</p>
                {site && <p className="text-xs text-slate-500">{site.address}</p>}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted By</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{req.submittedByName}</p>
                <p className="text-xs text-slate-500">{formatDate(req.createdAt)}</p>
              </div>
              {req.assetName && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Linked Asset</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{req.assetName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Info */}
          {vendor && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Vendor Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Vendor Name</p>
                  <p className="text-sm font-semibold text-slate-800">{vendor.name}</p>
                  <p className="text-xs text-slate-500">{vendor.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Invoice Amount</p>
                  <p className="text-sm font-semibold text-slate-800">{req.invoiceAmount ? formatCurrency(req.invoiceAmount) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Bank</p>
                  <p className="text-sm text-slate-700">{vendor.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Account</p>
                  <p className="text-sm text-slate-700">{vendor.accountNumber} — {vendor.accountName}</p>
                </div>
              </div>
              {req.invoiceUrl && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-sm text-slate-500">
                  <FileText size={14} />
                  <span>Invoice document attached</span>
                </div>
              )}
            </div>
          )}

          {/* Purchase Order */}
          {req.purchaseOrder && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Purchase Order</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">PO Number</p>
                  <p className="text-sm font-bold text-brand-600">{req.purchaseOrder.poNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Amount</p>
                  <p className="text-sm font-semibold text-slate-800">{formatCurrency(req.purchaseOrder.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Generated By</p>
                  <p className="text-sm text-slate-700">{req.purchaseOrder.generatedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Generated At</p>
                  <p className="text-sm text-slate-700">{formatDateTime(req.purchaseOrder.generatedAt)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          {req.taxType && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Payment Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Gross Amount</span>
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(req.grossAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Tax ({TAX_LABELS[req.taxType]})</span>
                  <span className="text-sm font-semibold text-red-600">- {formatCurrency(req.taxAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-bold text-slate-900">Net Payment</span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(req.netPayment ?? 0)}</span>
                </div>
              </div>
              {req.paymentReceiptUrl && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle size={14} />
                  <span>Payment receipt uploaded</span>
                </div>
              )}
            </div>
          )}

          {/* Rejection Info */}
          {req.status === 'REJECTED' && req.rejectionComment && (
            <div className="card p-5 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-red-800 mb-1">Rejection Reason</h2>
                  <p className="text-sm text-red-700">{req.rejectionComment}</p>
                </div>
              </div>
            </div>
          )}

          {/* Budget widget */}
          {budgetSum && (
            <BudgetWidget
              budget={budgetSum.budget}
              spent={budgetSum.spent}
              remaining={budgetSum.remaining}
              utilizationPct={budgetSum.utilizationPct}
            />
          )}

          {/* ACTION PANEL */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {/* Procurement: accept into review */}
              {role === 'procurement' && req.status === 'REQUEST_CREATED' && (
                <button onClick={handleMoveToProcurement} className="btn-primary">
                  Accept into Review
                </button>
              )}
              {/* Procurement: generate PO */}
              {role === 'procurement' && req.status === 'PROCUREMENT_REVIEW' && (
                <button onClick={handleGeneratePO} className="btn-primary">
                  Generate Purchase Order
                </button>
              )}
              {/* Supervisor: approve / reject */}
              {role === 'supervisor' && (req.status === 'PO_GENERATED' || req.status === 'SUPERVISOR_APPROVAL') && (
                <>
                  <button onClick={handleApprove} className="btn-success">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button onClick={handleReject} className="btn-danger">
                    <XCircle size={14} /> Reject
                  </button>
                </>
              )}
              {/* Finance: process payment */}
              {role === 'finance' && (req.status === 'PAYMENT_PENDING' || req.status === 'ADMIN_APPROVED') && !req.taxType && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleProcessPayment('5pct_wht')} className="btn-secondary text-xs">Apply 5% WHT</button>
                  <button onClick={() => handleProcessPayment('10pct_wht')} className="btn-secondary text-xs">Apply 10% WHT</button>
                  <button onClick={() => handleProcessPayment('exempt')} className="btn-secondary text-xs">Tax Exempt</button>
                </div>
              )}
              {role === 'finance' && req.taxType && req.status !== 'PAID' && req.status !== 'CLOSED' && (
                <button onClick={handleMarkPaid} className="btn-success">
                  <DollarSign size={14} /> Mark as Paid & Upload Receipt
                </button>
              )}
              {/* Admin: emergency bypass */}
              {role === 'admin' && req.status === 'REQUEST_CREATED' && (
                <button onClick={handleEmergencyBypass} className="btn-primary bg-purple-600 hover:bg-purple-700">
                  <Zap size={14} /> Emergency Bypass
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Visible Track Timeline */}
        <div className="lg:col-span-2">
          <div className="card p-5 sticky top-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Visible Track</h2>
              <span className="badge bg-slate-100 text-slate-600">{req.auditTrail.length} entries</span>
            </div>
            <div className="text-xs text-slate-400 mb-4 pb-3 border-b border-slate-100">
              This timeline is permanent and cannot be edited or deleted.
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
              <AuditTimeline entries={req.auditTrail} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
