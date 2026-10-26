import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Flag, Loader2, Mail, OctagonX } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';
import type { FacilityVendorSLA } from '../../types';

// Spec §5.11 — vendor SLA response clocks, scoped per facility SLA.
// Scored window: engagement → FM-confirmed work completion.
//   - prepaid (annual contract): engaged at PO issue (or request creation) —
//     they're already paid, so the window runs to first attendance/completion.
//   - per_service: clock starts when accounts pays (paidAt) and stops when the
//     FM confirms work complete. Pre-payment queue time is internal, not vendor.
type ClockJob = { createdAt: string; purchaseOrder?: { generatedAt: string }; paidAt?: string; vendorAttendedAt?: string; workCompletedAt?: string };
function clockStart(sla: FacilityVendorSLA, job: ClockJob): number | null {
  if (sla.paymentModel === 'prepaid') return new Date(job.purchaseOrder?.generatedAt ?? job.createdAt).getTime();
  return job.paidAt ? new Date(job.paidAt).getTime() : null;
}
function clockEnd(job: ClockJob): number | null {
  const end = job.workCompletedAt ?? job.vendorAttendedAt;
  return end ? new Date(end).getTime() : null;
}

export default function VendorScorecardPage() {
  const { vendors, requests, sites, facilityVendorSLAs, updateFacilityVendorSLA, currentUser } = useStore();
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    return facilityVendorSLAs.map(sla => {
      const vendor = vendors.find(v => v.id === sla.vendorId);
      const site = sites.find(s => s.id === sla.siteId);
      const jobs = requests.filter(r => r.vendorId === sla.vendorId && r.siteId === sla.siteId && (!sla.category || !r.category || r.category.toLowerCase() === sla.category.toLowerCase()));
      const done = jobs.filter(j => clockEnd(j) !== null);
      const live = jobs.filter(j => clockEnd(j) === null && !['REJECTED'].includes(j.status));
      // Only jobs where the vendor clock actually started count toward the score
      const scored = done.filter(j => clockStart(sla, j) !== null);
      const within = scored.filter(j =>
        (clockEnd(j)! - clockStart(sla, j)!) / 3600000 <= sla.responseSlaHours
      );
      const breaches = scored.filter(j =>
        (clockEnd(j)! - clockStart(sla, j)!) / 3600000 > sla.responseSlaHours
      );
      return {
        vendor, site, sla,
        jobs: jobs.length,
        compliance: scored.length ? Math.round((within.length / scored.length) * 100) : null,
        breaches: breaches.length, live,
      };
    }).filter(s => s.jobs > 0 || s.sla);
  }, [vendors, requests, sites, facilityVendorSLAs]);

  const patch = async (sla: FacilityVendorSLA, data: Partial<FacilityVendorSLA>) => {
    setBusy(sla.id);
    try {
      await updateFacilityVendorSLA(sla.id, data);
    } finally {
      setBusy(null);
    }
  };

  const issueNotice = (sla: FacilityVendorSLA) => {
    const reason = window.prompt('Breach notice text:', 'Consistent failure to meet the contracted response time. Improve performance or the contract will be reviewed.');
    if (reason === null) return;
    const notice = { issuedBy: currentUser?.name ?? 'Procurement', at: new Date().toISOString(), reason: reason.trim() || 'Consistent SLA response breaches' };
    void patch(sla, { breachNotices: [...(sla.breachNotices ?? []), notice] });
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Procurement</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Vendor SLA scorecard</h1>
          <p className="text-white/60 text-sm mt-1">Vendor delivery compliance per SLA. Pay-per-service jobs are scored payment → FM-confirmed completion; prepaid vendors from engagement → completion.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats.map(({ vendor: v, site, sla, jobs, compliance, breaches, live }) => (
          <div key={sla.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-slate-900">{v?.name ?? 'Unknown vendor'}</p>
                <p className="text-xs text-slate-500">{site?.name ?? 'Unknown site'} · {sla.category || 'All categories'} · {jobs} job{jobs === 1 ? '' : 's'} · {formatCurrency(v?.totalAmountPaid ?? 0)} paid</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="badge bg-blue-100 text-blue-700">{sla.responseSlaHours}h response SLA</span>
                <span className={`badge ${sla.paymentModel === 'prepaid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{sla.paymentModel === 'prepaid' ? 'Prepaid' : 'Pay per service'}</span>
                {sla.suspended && <span className="badge bg-red-100 text-red-700">Suspended from new jobs</span>}
                {sla.renewalReview && <span className="badge bg-amber-100 text-amber-700">Flagged for renewal review</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-900">{compliance === null ? '—' : `${compliance}%`}</p><p className="text-[10px] text-slate-400 uppercase font-semibold">Compliance</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className={`text-lg font-black ${breaches ? 'text-red-600' : 'text-slate-900'}`}>{breaches}</p><p className="text-[10px] text-slate-400 uppercase font-semibold">Breaches</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-900">{live.length}</p><p className="text-[10px] text-slate-400 uppercase font-semibold">Live jobs</p></div>
            </div>

            {live.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><Activity size={10} />Live clocks</p>
                {live.map(j => {
                  const start = clockStart(sla, j);
                  if (start === null) {
                    return (
                      <div key={j.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-500">{j.requestNumber}</span>
                        <span className="text-slate-400 font-medium">{sla.paymentModel === 'prepaid' ? 'awaiting engagement' : 'awaiting payment — internal queue'}</span>
                      </div>
                    );
                  }
                  const elapsed = (now - start) / 3600000;
                  const remaining = sla.responseSlaHours - elapsed;
                  return (
                    <div key={j.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500">{j.requestNumber}</span>
                      <span className={remaining >= 0 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {remaining >= 0 ? `${remaining.toFixed(1)}h left` : `${Math.abs(remaining).toFixed(1)}h over`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {breaches >= 2 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Breach actions</p>
                <div className="alert-warning flex items-start gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    {v?.name ?? 'This vendor'} has breached its {sla.responseSlaHours}-hour response target {breaches} times
                    {sla.expiryDate ? ` and its SLA expires ${formatDate(sla.expiryDate)}` : ''}. Renewal terms should be renegotiated or the vendor replaced.
                  </p>
                </div>
                <div className="space-y-2">
                  <button onClick={() => issueNotice(sla)} disabled={busy === sla.id} className="btn-secondary w-full justify-center text-xs">
                    <Mail size={13} /> Issue breach notice{(sla.breachNotices ?? []).length > 0 ? ` (${sla.breachNotices!.length} issued)` : ''}
                  </button>
                  <button onClick={() => void patch(sla, { renewalReview: !sla.renewalReview })} disabled={busy === sla.id} className="btn-secondary w-full justify-center text-xs">
                    <Flag size={13} /> {sla.renewalReview ? 'Remove renewal review flag' : 'Flag for renewal review'}
                  </button>
                  <button onClick={() => void patch(sla, { suspended: !sla.suspended })} disabled={busy === sla.id} className={`w-full justify-center text-xs ${sla.suspended ? 'btn-secondary' : 'btn-danger'}`}>
                    {busy === sla.id ? <Loader2 size={13} className="animate-spin" /> : <OctagonX size={13} />}
                    {sla.suspended ? 'Reinstate vendor' : 'Suspend from new jobs'}
                  </button>
                </div>
                {(sla.breachNotices ?? []).length > 0 && (
                  <p className="text-[11px] text-slate-400 mt-2">Last notice {formatDate(sla.breachNotices![sla.breachNotices!.length - 1].at)} by {sla.breachNotices![sla.breachNotices!.length - 1].issuedBy}</p>
                )}
              </div>
            )}
          </div>
        ))}
        {stats.length === 0 && (
          <div className="card p-14 text-center text-sm text-slate-400 lg:col-span-2">No facility vendor SLAs yet — ask an FM to add SLAs under Facility → SLA.</div>
        )}
      </div>
    </div>
  );
}
