import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Building2, User, AlertTriangle, CheckCircle, XCircle, DollarSign, Zap, Clock, Trash2, Paperclip } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { markVendorAttended, uploadFile } from '../../lib/firestore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import AuditTimeline from '../../components/shared/AuditTimeline';
import BudgetWidget from '../../components/shared/BudgetWidget';
import Lightbox from '../../components/shared/Lightbox';
import DocPreview from '../../components/shared/DocPreview';
import {
  formatCurrency, formatDateTime, formatDate,
  getSlaStatus, TAX_LABELS
} from '../../utils/helpers';

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, sites, vendors, currentUser, updateRequestStatus, updateRequest, generatePO, processPayment, markPaid, deleteRequest, facilityVendorSLAs, incidents } = useStore();
  const [now, setNow] = useState(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [completionFile, setCompletionFile] = useState<File | null>(null);
  const [uploadingCompletion, setUploadingCompletion] = useState(false);
  const [fixInvoiceFile, setFixInvoiceFile] = useState<File | null>(null);
  const [fixFiles, setFixFiles] = useState<File[]>([]);
  const [resubmitting, setResubmitting] = useState(false);
  const [poDoc, setPoDoc] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt?: string } | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  const req = requests.find(r => r.id === id);
  const site = req ? sites.find(s => s.id === req.siteId) : null;
  const vendor = req?.vendorId ? vendors.find(v => v.id === req.vendorId) : null;
  const vendorSLA = req?.vendorId
    ? facilityVendorSLAs.find(sla =>
        sla.siteId === req.siteId &&
        sla.vendorId === req.vendorId &&
        (!req.category || !sla.category || sla.category.toLowerCase() === req.category.toLowerCase())
      )
    : null;
  const budgetSum = site ? {
    budget: site.monthlyBudget,
    spent: site.currentMonthSpend,
    remaining: site.monthlyBudget - site.currentMonthSpend,
    utilizationPct: site.monthlyBudget > 0 ? Math.round((site.currentMonthSpend / site.monthlyBudget) * 100) : 0,
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

  const handleDelete = async () => {
    if (!window.confirm(`Delete request ${req.requestNumber}? This cannot be undone.`)) return;
    await deleteRequest(req.id);
    navigate('/fm/requests');
  };

  const handleProcessPayment = (taxType: '5pct_wht' | '10pct_wht' | 'exempt') => {
    processPayment(req.id, taxType, currentUser!.id);
  };

  const handleMarkPaid = async () => {
    if (!currentUser || !receiptFile) return;
    const receiptUrl = await uploadFile(`receipts/${req.id}/${crypto.randomUUID()}-${receiptFile.name}`, receiptFile);
    markPaid(req.id, currentUser.id, receiptUrl);
    navigate(-1);
  };

  const handleEmergencyBypass = () => {
    updateRequestStatus(req.id, 'ADMIN_APPROVED', currentUser!.id, '⚡ EMERGENCY BYPASS ACTIVATED — Admin override. Routed directly to Payment Pending.');
  };

  const handleResubmit = async () => {
    if (!currentUser) return;
    setResubmitting(true);
    try {
      const updates: { invoiceUrl?: string; attachments?: { name: string; url: string; originalSize: number; compressedSize: number }[] } = {};
      if (fixInvoiceFile) {
        updates.invoiceUrl = await uploadFile(`invoices/${req.id}/${crypto.randomUUID()}-${fixInvoiceFile.name}`, fixInvoiceFile);
      }
      if (fixFiles.length) {
        const uploaded = await Promise.all(fixFiles.map(async file => ({
          name: file.name,
          url: await uploadFile(`attachments/${req.id}/${crypto.randomUUID()}-${file.name}`, file),
          originalSize: file.size,
          compressedSize: file.size,
        })));
        updates.attachments = [...(req.attachments ?? []), ...uploaded];
      }
      if (Object.keys(updates).length) await updateRequest(req.id, updates);
      const note = [
        'Request resubmitted after rejection',
        fixInvoiceFile ? 'corrected invoice/quote uploaded' : '',
        fixFiles.length ? `${fixFiles.length} document${fixFiles.length === 1 ? '' : 's'} attached` : '',
      ].filter(Boolean).join(' — ') + '. Returned to Procurement queue.';
      updateRequestStatus(req.id, 'REQUEST_CREATED', currentUser.id, note);
      setFixInvoiceFile(null); setFixFiles([]);
    } finally {
      setResubmitting(false);
    }
  };

  const handleCompletionUpload = async () => {
    if (!completionFile || !currentUser) return;
    setUploadingCompletion(true);
    try {
      const url = await uploadFile(`job-completions/${req.id}/${crypto.randomUUID()}-${completionFile.name}`, completionFile);
      await updateRequest(req.id, { jobCompletionUrl: url });
      setCompletionFile(null);
    } finally {
      setUploadingCompletion(false);
    }
  };

  const downloadPO = () => {
    const po = req.purchaseOrder;
    if (!po) return;
    const fmtD = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const num = (n: number) => n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const vendorName = vendor?.name ?? req.vendorName ?? '—';
    const vendorTin = vendor?.tin?.trim() || 'N/A';
    setPoDoc(`<!doctype html><html><head><meta charset="utf-8"><title>${po.poNumber}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Open Sans',Arial,Helvetica,sans-serif;color:#333;font-size:12px;background:#eee;display:flex;justify-content:center;padding:24px}
      .page{width:794px;min-height:1123px;background:#fff;position:relative;padding:64px 40px 48px 52px;box-shadow:0 2px 12px rgba(0,0,0,.15)}
      @media print{body{background:#fff;padding:0}.page{box-shadow:none;width:auto}}
      .label{text-align:right}
      </style></head><body>
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <img src="/propel-logo.png" alt="Propel Properties &amp; Facilities Services Ltd. logo" style="width:170px;height:auto;margin-top:14px;margin-left:14px" />
          <div style="text-align:right;padding-top:6px">
            <div style="font-size:36px;font-weight:400;color:#000;letter-spacing:.5px;line-height:1.2">PURCHASE ORDER</div>
            <div style="font-size:12px;font-weight:700;color:#333;margin-top:10px"># <span style="display:inline-block;min-width:110px;text-align:left">${po.poNumber}</span></div>
          </div>
        </div>

        <div style="margin-top:28px">
          <div style="font-weight:700;font-size:13px;color:#222">PROPEL PROPERTIES AND FACILITIES SERVICES LTD</div>
          <div style="font-size:12px;margin-top:2px">Nigeria</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 150px;column-gap:16px;row-gap:14px;width:330px;margin-left:auto;margin-top:36px;font-size:12px">
          <div style="text-align:right">Date :</div><div style="text-align:left;font-weight:600">${fmtD(po.generatedAt)}</div>
          <div style="text-align:right">Delivery Date :</div><div style="text-align:left;font-weight:600">${fmtD(po.generatedAt)}</div>
          <div style="text-align:right">Ref# :</div><div style="text-align:left;font-weight:600">${req.requestNumber}</div>
          <div style="text-align:right">Vendor TIN/ Tax ID :</div><div style="text-align:left;font-weight:600">${vendorTin}</div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:14px">
          <div style="width:300px;padding-top:10px">
            <div style="font-size:12px">Vendor Address</div>
            <div style="font-size:12px;font-weight:600;color:#222;margin-top:4px">${vendorName}</div>
            <div style="font-size:12px;margin-top:34px">Deliver To</div>
            <div style="font-size:12px;margin-top:4px">${req.siteName}</div>
            <div style="font-size:12px;margin-top:2px">${site?.address ? `${site.address}, ` : ''}Nigeria</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 150px;column-gap:16px;row-gap:22px;width:330px;font-size:12px;align-items:center">
            <div style="text-align:right;padding-left:40px">Vendor Bank Account Name :</div><div style="text-align:left;font-weight:600">${vendor?.accountName || '—'}</div>
            <div style="text-align:right;padding-left:40px">Vendor Bank Account Number :</div><div style="text-align:left;font-weight:600">${vendor?.accountNumber || '—'}</div>
            <div style="text-align:right">Vendor Bank Name :</div><div style="text-align:left;font-weight:600">${vendor?.bankName || '—'}</div>
          </div>
        </div>

        <div style="margin-top:26px">
          <div style="display:grid;grid-template-columns:50px 1fr 70px 100px 110px;background:#3c3d3a;color:#fff;font-size:12px;font-weight:600">
            <div style="padding:10px 0;text-align:center">#</div>
            <div style="padding:10px 8px">Item &amp; Description</div>
            <div style="padding:10px 8px;text-align:right">Qty</div>
            <div style="padding:10px 8px;text-align:right">Rate</div>
            <div style="padding:10px 10px;text-align:right">Amount</div>
          </div>
          <div style="display:grid;grid-template-columns:50px 1fr 70px 100px 110px;font-size:12px;border-bottom:1px solid #adadad;min-height:52px">
            <div style="padding:12px 0;text-align:center">1</div>
            <div style="padding:12px 8px;color:#555">${req.description.replace(/\n/g, '<br/>')}</div>
            <div style="padding:12px 8px;text-align:right">1.00</div>
            <div style="padding:12px 8px;text-align:right">${num(po.amount)}</div>
            <div style="padding:12px 10px;text-align:right">${num(po.amount)}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 140px;column-gap:24px;width:270px;margin-left:auto;margin-top:12px;font-size:12px">
          <div style="text-align:right;padding:4px 0">Sub Total</div><div style="text-align:right;padding:4px 10px 4px 0">${num(po.amount)}</div>
        </div>
        <div style="width:270px;margin-left:auto;border-top:1px solid #adadad;margin-top:10px"></div>
        <div style="display:grid;grid-template-columns:1fr 140px;column-gap:24px;width:270px;margin-left:auto;margin-top:10px;font-size:12px;font-weight:700">
          <div style="text-align:right;padding:4px 0">Total</div><div style="text-align:right;padding:4px 10px 4px 0">NGN${num(po.amount)}</div>
        </div>

        <div style="margin-top:56px">
          <div style="font-size:13px">Terms &amp; Conditions</div>
          <div style="font-size:12px;color:#444;margin-top:10px;line-height:1.6">Please make Payment to</div>
          <div style="font-size:12px;color:#444;line-height:1.6">${vendor?.accountName || ''}</div>
          <div style="font-size:12px;color:#444;line-height:1.6">${[vendor?.accountNumber, vendor?.bankName].filter(Boolean).join(' · ') || ''}</div>
        </div>

        <div style="position:absolute;left:52px;right:40px;bottom:32px;border-top:1px solid #adadad;padding-top:6px;text-align:right;font-size:10px;color:#666">1</div>
      </div>
      </body></html>`);
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
            <h2 className="section-title mb-3">Fault description</h2>
            <p className="text-slate-700 leading-relaxed">{req.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {req.category && <span className="badge bg-slate-100 text-slate-600">{req.category}</span>}
              {req.location && <span className="badge bg-blue-50 text-blue-700">{req.location}</span>}
              {req.slaAvailable && <span className="badge bg-emerald-100 text-emerald-700">SLA linked</span>}
            </div>
            {(req.attachments?.length ?? 0) > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <Paperclip size={13} />
                  <span>Attachments ({req.attachments!.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {req.attachments!.map(att => {
                    const isImage = /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(att.name) || /\.(png|jpe?g|gif|webp|heic|avif)([?#]|$)/i.test(att.url);
                    return isImage ? (
                      <button key={att.url} type="button" onClick={() => setLightbox({ src: att.url, alt: att.name })} className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                        <img src={att.url} alt={att.name} className="w-28 h-28 object-cover" loading="lazy" />
                      </button>
                    ) : (
                      <a key={att.url} href={att.url} target="_blank" rel="noreferrer" className="badge bg-slate-100 text-slate-600 hover:bg-slate-200">
                        <FileText size={11} /> {att.name}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Linked incident */}
          {req.linkedIncidentId && (() => {
            const incident = incidents.find(i => i.id === req.linkedIncidentId);
            return incident ? (
              <div className="card p-5">
                <h2 className="section-title mb-3">Linked incident</h2>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{incident.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Logged {formatDateTime(incident.createdAt)}{incident.updatedAt !== incident.createdAt ? ` · Updated ${formatDateTime(incident.updatedAt)}` : ''}</p>
                    {incident.resolutionNotes && <p className="text-xs text-slate-500 mt-1">Closure note: {incident.resolutionNotes}</p>}
                  </div>
                  <span className="badge bg-red-100 text-red-700">{incident.status}</span>
                </div>
              </div>
            ) : null;
          })()}

          {/* Site & Asset */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Site and asset information</h2>
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
          {(vendor || req.oneTimeVendor?.name) && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Vendor details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Vendor Name</p>
                  <p className="text-sm font-semibold text-slate-800">{vendor?.name ?? req.oneTimeVendor?.name}</p>
                  <p className="text-xs text-slate-500">{vendor?.category ?? 'One-time vendor'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Invoice Amount</p>
                  <p className="text-sm font-semibold text-slate-800">{req.invoiceAmount ? formatCurrency(req.invoiceAmount) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Bank</p>
                  <p className="text-sm text-slate-700">{vendor?.bankName ?? req.oneTimeVendor?.bankName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Account</p>
                  <p className="text-sm text-slate-700">{vendor ? `${vendor.accountNumber} — ${vendor.accountName}` : `${req.oneTimeVendor?.accountNumber ?? '—'} — ${req.oneTimeVendor?.accountName ?? '—'}`}</p>
                </div>
              </div>
              {req.oneTimeVendor?.notes && <p className="mt-3 text-xs text-slate-500">Exemption / payment note: {req.oneTimeVendor.notes}</p>}
              {req.invoiceUrl && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Invoice / quote document</p>
                  {/\.(png|jpe?g|gif|webp|heic|avif)([?#]|$)/i.test(req.invoiceUrl) ? (
                    <button type="button" onClick={() => setLightbox({ src: req.invoiceUrl!, alt: 'Invoice' })} className="inline-block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                      <img src={req.invoiceUrl} alt="Invoice" className="w-40 h-40 object-cover" loading="lazy" />
                    </button>
                  ) : (
                    <a href={req.invoiceUrl} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-sm text-brand-600 hover:bg-slate-100">
                      <FileText size={14} />
                      <span>View invoice / quote document</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Purchase Order */}
          {req.purchaseOrder && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Purchase order</h2>
                {role !== 'supervisor' && role !== 'technician' && (
                  <button onClick={downloadPO} className="btn-primary text-xs"><FileText size={13} /> Download PO</button>
                )}
              </div>
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
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Generated At</p>
                  <p className="text-sm text-slate-700">{formatDateTime(req.purchaseOrder.generatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Approved At</p>
                  <p className="text-sm text-slate-700">{req.supervisorApprovedAt ? formatDateTime(req.supervisorApprovedAt) : '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          {req.taxType && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Payment summary</h2>
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
                <div className="mt-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Payment receipt</p>
                  {/\.(png|jpe?g|gif|webp|heic|avif)([?#]|$)/i.test(req.paymentReceiptUrl) ? (
                    <button type="button" onClick={() => setLightbox({ src: req.paymentReceiptUrl!, alt: 'Payment receipt' })} className="inline-block rounded-lg overflow-hidden border border-emerald-200 hover:opacity-90 transition-opacity">
                      <img src={req.paymentReceiptUrl} alt="Payment receipt" className="w-40 h-40 object-cover" loading="lazy" />
                    </button>
                  ) : null}
                  <a href={req.paymentReceiptUrl} target="_blank" rel="noreferrer" download className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle size={14} />
                    <span className="font-semibold">Download payment receipt</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Job completion form */}
          {(req.jobCompletionUrl || ((req.status === 'PAID' || req.status === 'CLOSED') && (role === 'facility_manager' || role === 'admin'))) && (
            <div className="card p-5">
              <h2 className="section-title mb-3">Job completion form</h2>
              {req.jobCompletionUrl ? (
                /\.(png|jpe?g|gif|webp|heic|avif)([?#]|$)/i.test(req.jobCompletionUrl) ? (
                  <button type="button" onClick={() => setLightbox({ src: req.jobCompletionUrl!, alt: 'Job completion form' })} className="inline-block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                    <img src={req.jobCompletionUrl} alt="Job completion form" className="w-40 h-40 object-cover" loading="lazy" />
                  </button>
                ) : (
                  <a href={req.jobCompletionUrl} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-sm text-brand-600 hover:bg-slate-100">
                    <FileText size={14} />
                    <span>View job completion form</span>
                  </a>
                )
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Upload the signed job completion form for this request.</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input className="input text-xs max-w-56" type="file" accept="image/*,.pdf" onChange={e => setCompletionFile(e.target.files?.[0] ?? null)} />
                    <button onClick={handleCompletionUpload} disabled={!completionFile || uploadingCompletion} className="btn-primary text-xs">
                      {uploadingCompletion ? 'Uploading…' : 'Upload form'}
                    </button>
                  </div>
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
              {(role === 'procurement' || role === 'admin') && req.status === 'REQUEST_CREATED' && (
                <button onClick={handleMoveToProcurement} className="btn-primary">
                  Accept into Review
                </button>
              )}
              {/* Procurement: generate PO */}
              {(role === 'procurement' || role === 'admin') && req.status === 'PROCUREMENT_REVIEW' && (
                <button onClick={handleGeneratePO} className="btn-primary">
                  Generate Purchase Order
                </button>
              )}
              {/* Procurement: reject at review stage */}
              {(role === 'procurement' || role === 'admin') && (req.status === 'REQUEST_CREATED' || req.status === 'PROCUREMENT_REVIEW') && (
                <button onClick={handleReject} className="btn-danger">
                  <XCircle size={14} /> Reject
                </button>
              )}
              {/* FM/admin: correct + resubmit after rejection */}
              {(role === 'admin' || req.submittedBy === currentUser?.id) && req.status === 'REJECTED' && (
                <div className="w-full space-y-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-600">Fix the issue noted in the rejection, then resubmit. You can replace the invoice/quote or attach corrected documents.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="label">Replacement invoice / quote</label>
                      <input type="file" accept="image/*,.pdf" className="input text-xs" onChange={e => setFixInvoiceFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Attach corrected documents</label>
                      <input type="file" multiple accept="image/*,.pdf" className="input text-xs" onChange={e => setFixFiles(Array.from(e.target.files ?? []))} />
                    </div>
                  </div>
                  <button onClick={handleResubmit} className="btn-primary" disabled={resubmitting}>
                    {resubmitting ? 'Uploading & resubmitting…' : 'Resubmit request'}
                  </button>
                </div>
              )}
              {/* Supervisor: approve / reject */}
              {(role === 'supervisor' || role === 'admin') && (req.status === 'PO_GENERATED' || req.status === 'SUPERVISOR_APPROVAL') && (
                <>
                  <button onClick={handleApprove} className="btn-success">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button onClick={handleReject} className="btn-danger">
                    <XCircle size={14} /> Reject
                  </button>
                </>
              )}
              {/* FM/admin: delete a request that hasn't entered procurement yet */}
              {(role === 'admin' || req.submittedBy === currentUser?.id) && req.status === 'REQUEST_CREATED' && (
                <button onClick={handleDelete} className="btn-danger">
                  <Trash2 size={14} /> Delete request
                </button>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <input className="input text-xs max-w-56" type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />
                  <button onClick={handleMarkPaid} disabled={!receiptFile} className="btn-success disabled:opacity-50">
                    <DollarSign size={14} /> Mark as paid
                  </button>
                </div>
              )}
              {/* Admin: veto approve — skips every remaining stage, straight to payment */}
              {role === 'admin' && ['REQUEST_CREATED', 'PROCUREMENT_REVIEW', 'PO_GENERATED', 'SUPERVISOR_APPROVAL'].includes(req.status) && (
                <button onClick={handleEmergencyBypass} className="btn-primary bg-purple-600 hover:bg-purple-700">
                  <Zap size={14} /> Veto — approve &amp; skip to payment
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
              {/* FM: vendor SLA clock (spec §5.11) */}
              {role === 'facility_manager' && vendor && !req.vendorAttendedAt && (
                <button
                  onClick={async () => {
                    try { await markVendorAttended(req.id); } catch (e) { alert(String(e instanceof Error ? e.message : e)); }
                  }}
                  className="btn-secondary"
                >
                  <Clock size={14} /> Log vendor on-site attendance
                </button>
              )}

            {/* Vendor response clock status */}
            {vendorSLA?.responseSlaHours && req.vendorId && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                {req.vendorAttendedAt ? (
                  (() => {
                    const hrs = (new Date(req.vendorAttendedAt).getTime() - new Date(req.createdAt).getTime()) / 3600000;
                    const ok = hrs <= vendorSLA.responseSlaHours;
                    return (
                      <span className={`badge ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        Vendor responded in {hrs.toFixed(1)}h — SLA {vendorSLA.responseSlaHours}h · {ok ? 'Within SLA' : 'SLA breached'}
                      </span>
                    );
                  })()
                ) : (
                  (() => {
                    const hrs = (now - new Date(req.createdAt).getTime()) / 3600000;
                    const remaining = vendorSLA.responseSlaHours - hrs;
                    return (
                      <span className={`badge ${remaining >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        Response clock running — {remaining >= 0 ? `${remaining.toFixed(1)}h of ${vendorSLA.responseSlaHours}h SLA remaining` : `${Math.abs(remaining).toFixed(1)}h over SLA`}
                      </span>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {poDoc && <DocPreview html={poDoc} title={`Purchase order ${req.purchaseOrder?.poNumber ?? ''}`} onClose={() => setPoDoc(null)} />}
    </div>
  );
}
