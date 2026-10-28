import { useNavigate } from 'react-router-dom';
import { AlertCircle, FilePlus, CheckCircle, Hourglass, CalendarCheck, Wallet, FileBadge, ChevronRight, ArrowUp } from 'lucide-react';
import { useStore, reportSaveError } from '../../store/useStore';
import { StatusBadge } from '../../components/shared/Badges';
import { formatCurrency } from '../../utils/helpers';

export default function FMDashboard() {
  const navigate = useNavigate();
  const { currentUser, requests, sites, checklists, ppmSchedules, vendors, pettyCash, activeSiteId, users, facilityVendorSLAs, getSiteMonthSpend, acknowledgeActingHandover } = useStore();

  // Acting FM handover acknowledgement (spec §5.8)
  const todayIso = new Date().toISOString().slice(0, 10);
  const actingActive = currentUser?.actingForProfileId && currentUser.actingStart && currentUser.actingEnd
    && currentUser.actingStart <= todayIso && currentUser.actingEnd >= todayIso;
  const coveringFm = actingActive ? users.find(u => u.id === currentUser.actingForProfileId) : undefined;
  const handover = currentUser?.actingHandover ?? {};

  const siteId = activeSiteId ?? currentUser?.siteId;
  const site = sites.find(s => s.id === siteId);
  const myRequests = requests.filter(r => r.siteId === siteId);
  const openRequests = myRequests.filter(r => !['PAID', 'CLOSED', 'REJECTED'].includes(r.status));
  const executed = myRequests.filter(r => r.status === 'PAID' || r.status === 'CLOSED');
  const rejected = myRequests.filter(r => r.status === 'REJECTED');
  const slaBreached = myRequests.filter(r => r.slaBreached && !['PAID', 'CLOSED', 'REJECTED'].includes(r.status));
  const pendingChecklists = checklists.filter(c => c.siteId === siteId && !c.submittedToAdmin);

  // Pending tasks (rejected requests, unsubmitted checklists, SLA alerts)
  const pendingTasks: { badge: string; badgeClass: string; label: string; to: string }[] = [
    ...rejected.map(r => ({ badge: 'Rejected', badgeClass: 'b-danger', label: `Resubmit or revise — ${r.requestNumber}`, to: `/request/${r.id}` })),
    ...pendingChecklists.slice(0, 2).map(c => ({ badge: 'Due', badgeClass: 'b-ok', label: `Submit checklist — ${c.title}`, to: '/fm/checklists' })),
    ...slaBreached.map(r => ({ badge: 'SLA Alert', badgeClass: 'b-warn', label: `SLA breached — ${r.requestNumber}`, to: `/request/${r.id}` })),
  ].slice(0, 5);

  // Upcoming events from PPM + expiring vendor SLAs
  const upcomingPpm = ppmSchedules
    .filter(p => p.siteId === siteId && p.nextDueDate && p.status !== 'completed')
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, 3);
  const expiringSlas = facilityVendorSLAs.filter(sla => {
    if (sla.siteId !== siteId || !sla.expiryDate) return false;
    const days = Math.ceil((new Date(sla.expiryDate).getTime() - new Date().getTime()) / 86400000);
    return days >= 0 && days <= 60;
  }).map(sla => ({ ...sla, vendor: vendors.find(v => v.id === sla.vendorId) }));
  const events = [
    ...upcomingPpm.map(p => ({ date: p.nextDueDate, name: p.title, meta: vendors.find(v => v.id === p.vendorId)?.name ?? 'Scheduled task', badge: 'PPM', cls: 'b-info' })),
    ...expiringSlas.filter(s => s.expiryDate).map(s => ({ date: s.expiryDate!, name: `${s.vendor?.name ?? 'Vendor'} SLA renewal`, meta: `${s.category} contract`, badge: 'SLA', cls: 'b-warn' })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

  // Petty cash float
  const sitePetty = pettyCash.filter(p => p.siteId === siteId && p.status === 'approved');
  const floatBalance = sitePetty.reduce((sum, p) => sum + (p.type === 'top_up' ? p.amount : -p.amount), 0);
  const floatLimit = site?.floatLimit ?? 0;
  const floatPct = floatLimit > 0 ? Math.round((floatBalance / floatLimit) * 100) : 0;

  // PPM on-time rate for this site
  const sitePpm = ppmSchedules.filter(p => p.siteId === siteId);
  const ppmDone = sitePpm.filter(p => (p.serviceHistory?.length ?? 0) > 0 || p.status === 'completed');
  const ppmOnTime = sitePpm.length ? Math.round((ppmDone.length / sitePpm.length) * 100) : null;

  const completionPct = myRequests.length ? Math.round((executed.length / myRequests.length) * 100) : 0;
  const budget = site?.monthlyBudget ?? 0;
  const spent = site ? getSiteMonthSpend(site.id) : 0;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const budgetColor = budgetPct >= 90 ? 'var(--red)' : budgetPct >= 70 ? 'var(--amber)' : 'var(--green)';
  const monthLabel = new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  const pendingCount = pendingTasks.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1400 }}>

      <div>
        <h1 className="text-xl font-black text-slate-900">Facility manager dashboard</h1>
        <p className="text-sm text-slate-500">{currentUser?.name} · Facility Manager{siteId ? ` — ${sites.find(s => s.id === siteId)?.name ?? ''}` : ''}</p>
      </div>

      {/* ── Acting FM handover (spec §5.8) ── */}
      {actingActive && !currentUser?.actingAcknowledgedAt && coveringFm && (
        <div className="card" style={{ padding: '14px 15px', borderColor: '#C8C8E8' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="card-title">You are acting FM for {coveringFm.name} until {currentUser.actingEnd}</p>
              <p className="card-sub">Handover pack generated {handover.generatedAt ? new Date(String(handover.generatedAt)).toLocaleDateString('en-GB') : ''}:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 mt-2 text-xs" style={{ color: 'var(--gh-text-2)' }}>
                <span>Sites: {(handover.sites as string[] | undefined)?.join(', ') || '—'}</span>
                <span>Open requests: {(handover.openRequests as unknown[] | undefined)?.length ?? 0}</span>
                <span>Float balance: {formatCurrency(Number(handover.floatBalance ?? 0))}</span>
                <span>PPM due in 30 days: {(handover.ppmDueIn30Days as unknown[] | undefined)?.length ?? 0}</span>
                <span>SLAs expiring: {(handover.slasExpiring as unknown[] | undefined)?.length ?? 0}</span>
                <span>Assets under repair: {(handover.criticalAssets as unknown[] | undefined)?.length ?? 0}</span>
              </div>
            </div>
            <button className="btn-acc" onClick={() => void acknowledgeActingHandover().catch(reportSaveError)}>Acknowledge handover</button>
          </div>
        </div>
      )}

      {/* ── Attention banner ── */}
      {pendingCount > 0 && (
        <div className="warn-banner">
          <AlertCircle size={15} aria-hidden="true" />
          <span><strong>{pendingCount} pending task{pendingCount === 1 ? '' : 's'}</strong> require your attention today</span>
        </div>
      )}

      {/* ── KPI tiles ── */}
      <div className="kpi-grid">
        <div className="kpi c-acc">
          <div className="kpi-ico i-acc"><FilePlus size={14} aria-hidden="true" /></div>
          <div className="kpi-lbl">Requests logged</div>
          <div className="kpi-val">{myRequests.length}</div>
          <div className="kpi-sub up"><ArrowUp size={10} aria-hidden="true" /> {openRequests.length} open</div>
        </div>
        <div className="kpi c-green">
          <div className="kpi-ico i-green"><CheckCircle size={14} aria-hidden="true" /></div>
          <div className="kpi-lbl">Executed</div>
          <div className="kpi-val">{executed.length}</div>
          <div className="kpi-sub">{completionPct}% completion</div>
        </div>
        <div className="kpi c-blue">
          <div className="kpi-ico i-blue"><Hourglass size={14} aria-hidden="true" /></div>
          <div className="kpi-lbl">In progress</div>
          <div className="kpi-val">{openRequests.length}</div>
          <div className="kpi-sub">{myRequests.filter(r => r.status === 'PAYMENT_PENDING').length} at Finance</div>
        </div>
        <div className="kpi c-amber">
          <div className="kpi-ico i-amber"><CalendarCheck size={14} aria-hidden="true" /></div>
          <div className="kpi-lbl">PPM on-time</div>
          <div className="kpi-val">{ppmOnTime === null ? '—' : ppmOnTime}{ppmOnTime !== null && <span style={{ fontSize: 13, fontWeight: 400 }}>%</span>}</div>
          <div className="kpi-sub">{sitePpm.filter(p => p.status === 'deferred').length} deferred</div>
        </div>
        <div className="kpi c-teal">
          <div className="kpi-ico i-teal"><Wallet size={14} aria-hidden="true" /></div>
          <div className="kpi-lbl">Petty cash float</div>
          <div className="kpi-val">{formatCurrency(floatBalance)}</div>
          <div className="kpi-sub">{floatLimit ? `${floatPct}% of ${formatCurrency(floatLimit)} limit` : 'No limit set'}</div>
        </div>
        <div className="kpi c-red">
          <div className="kpi-ico i-red"><FileBadge size={14} aria-hidden="true" /></div>
          <div className="kpi-lbl">SLA expiring</div>
          <div className="kpi-val">{expiringSlas.length}</div>
          <div className="kpi-sub dn">{expiringSlas[0]?.expiryDate ? `${expiringSlas[0].vendor?.name ?? 'Vendor'} · ${Math.ceil((new Date(expiringSlas[0].expiryDate).getTime() - new Date().getTime()) / 86400000)} days` : 'None'}</div>
        </div>
      </div>

      {/* ── Pending tasks + Upcoming events ── */}
      <div className="row2">
        <div className="card" style={{ padding: '14px 15px' }}>
          <div className="card-hd">
            <div><div className="card-title">Pending tasks</div><div className="card-sub">Action required today</div></div>
            {pendingCount > 0 && <span className="badge b-danger">{pendingCount} item{pendingCount === 1 ? '' : 's'}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pendingTasks.map(task => (
              <button key={task.label} onClick={() => navigate(task.to)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--gh-border)', fontSize: 12, textAlign: 'left', color: 'var(--gh-text)' }}>
                <span className={`badge ${task.badgeClass}`}>{task.badge}</span>
                <span style={{ flex: 1 }}>{task.label}</span>
                <ChevronRight size={14} style={{ color: 'var(--gh-muted)' }} aria-hidden="true" />
              </button>
            ))}
            {pendingCount === 0 && <p className="text-xs" style={{ color: 'var(--gh-muted)', padding: '8px 0' }}>Nothing pending — all clear.</p>}
          </div>
        </div>
        <div className="card" style={{ padding: '14px 15px' }}>
          <div className="card-hd">
            <div><div className="card-title">Upcoming events</div><div className="card-sub">Next scheduled</div></div>
          </div>
          {events.map(ev => {
            const d = new Date(ev.date);
            return (
              <div className="event-row" key={ev.name}>
                <div className="event-date">
                  <div className="day">{d.getDate()}</div>
                  <div className="mon">{d.toLocaleDateString('en-NG', { month: 'short' })}</div>
                </div>
                <div className="event-info">
                  <div className="event-name">{ev.name}</div>
                  <div className="event-meta">{ev.meta}</div>
                </div>
                <span className={`badge ${ev.cls}`}>{ev.badge}</span>
              </div>
            );
          })}
          {events.length === 0 && <p className="text-xs" style={{ color: 'var(--gh-muted)', padding: '8px 0' }}>No upcoming events scheduled.</p>}
        </div>
      </div>

      {/* ── Budget status ── */}
      <div className="card" style={{ padding: '14px 15px' }}>
        <div className="card-hd">
          <div><div className="card-title">Budget status</div><div className="card-sub">{monthLabel}</div></div>
          {budgetPct >= 90 && <span className="badge b-warn">Near limit</span>}
        </div>
        <div className="bar-row">
          <span className="bar-lbl">Maintenance</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${budgetPct}%`, background: budgetColor }} /></div>
          <span className="bar-pct">{budgetPct}%</span>
          <span style={{ fontSize: 10, color: 'var(--gh-muted)', marginLeft: 6 }}>{formatCurrency(spent)} / {formatCurrency(budget)}</span>
        </div>
      </div>

      {/* ── Recent requests table ── */}
      <div className="fc">
        <div className="fc-hd">
          <span className="fc-title">Recent requests</span>
          <span className="fc-act" onClick={() => navigate('/fm/requests')}>View all →</span>
        </div>
        <div className="tbl-wrap"><table>
          <colgroup>
            <col style={{ width: 130 }} />
            <col />
            <col style={{ width: 140 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead><tr>
            <th scope="col" className="table-header">Request ID</th>
            <th scope="col" className="table-header">Description</th>
            <th scope="col" className="table-header">Amount</th>
            <th scope="col" className="table-header">Status</th>
            <th scope="col" className="table-header">Action</th>
          </tr></thead>
          <tbody>
            {myRequests.slice(0, 5).map(r => (
              <tr key={r.id} className="table-row" onClick={() => navigate(`/request/${r.id}`)}>
                <td className="table-cell id-col">{r.requestNumber}</td>
                <td className="table-cell">{r.description}</td>
                <td className="table-cell mono table-number">{formatCurrency(r.grossAmount ?? r.invoiceAmount ?? 0)}</td>
                <td className="table-cell"><StatusBadge status={r.status} /></td>
                <td className="table-cell table-action">
                  {r.status === 'REJECTED'
                    ? <button className="btn-acc" onClick={e => { e.stopPropagation(); navigate('/fm/request/new'); }}>Re-submit</button>
                    : <button className="btn-ghost" onClick={e => { e.stopPropagation(); navigate(`/request/${r.id}`); }}>View</button>}
                </td>
              </tr>
            ))}
            {myRequests.length === 0 && (
              <tr><td className="table-empty" colSpan={5}><strong>No requests yet</strong>Log your first maintenance request to begin tracking work at this facility.</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
