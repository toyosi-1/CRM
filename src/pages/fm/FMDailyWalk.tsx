import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Send, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ensureChecklistInstances, instanceId, isDueToday, scheduleLabel } from '../../lib/checklists';
import type { Checklist, ChecklistItem } from '../../types';
import { formatDate } from '../../utils/helpers';

const RATING_OPTS: { value: string; label: string; flagged: boolean; cls: string }[] = [
  { value: 'good', label: 'Good', flagged: false, cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'fair', label: 'Fair', flagged: false, cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'poor', label: 'Poor', flagged: true, cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'critical', label: 'Critical', flagged: true, cls: 'bg-red-100 text-red-700 border-red-300' },
];

export default function FMDailyWalk({ embedded }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { currentUser, checklists, checklistTemplates, saveChecklist, submitChecklist, activeSiteId, sites } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const site = sites.find(s => s.id === siteId);

  useEffect(() => {
    if (!siteId || !currentUser) return;
    void ensureChecklistInstances(siteId, checklistTemplates, checklists);
  }, [siteId, currentUser, checklistTemplates, checklists]);

  const dueTemplates = checklistTemplates.filter(t => t.siteId === siteId && isDueToday(t));
  const dueIds = new Set(dueTemplates.map(instanceId));
  const scheduleById = new Map(dueTemplates.map(t => [instanceId(t), scheduleLabel(t)]));
  const walks = checklists.filter(c => c.siteId === siteId && dueIds.has(c.id) && !c.submittedToAdmin);
  const submitted = checklists.filter(c => c.siteId === siteId && dueIds.has(c.id) && c.submittedToAdmin);

  const updateItem = (cl: Checklist, itemId: string, patch: Partial<ChecklistItem>) => {
    const items = cl.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
    saveChecklist(cl.id, items);
  };

  const respond = (cl: Checklist, item: ChecklistItem, value: string | number, flagged: boolean) => {
    updateItem(cl, item.id, { value, flagged, checked: true, timestamp: new Date().toISOString(), comment: flagged ? item.comment : undefined });
  };

  const walkComplete = (cl: Checklist) =>
    cl.items.every(i => i.checked) && cl.items.every(i => !i.flagged || (i.comment ?? '').trim().length > 0);

  const renderItem = (cl: Checklist, item: ChecklistItem) => {
    const type = item.responseType ?? 'passfail';
    return (
      <div key={item.id} className={`px-4 py-3 ${item.flagged ? 'bg-amber-50/60' : ''}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <p className={`text-sm font-medium flex-1 min-w-[160px] ${item.checked ? 'text-slate-500' : 'text-slate-800'}`}>{item.label}</p>
          {type === 'rating' && (
            <div className="flex gap-1.5">
              {RATING_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => respond(cl, item, opt.label, opt.flagged)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${item.value === opt.label ? opt.cls : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >{opt.label}</button>
              ))}
            </div>
          )}
          {type === 'passfail' && (
            <div className="flex gap-1.5">
              <button type="button" onClick={() => respond(cl, item, 'Pass', false)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold ${item.value === 'Pass' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>Pass</button>
              <button type="button" onClick={() => respond(cl, item, 'Fail', true)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold ${item.value === 'Fail' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>Fail</button>
            </div>
          )}
          {type === 'numeric' && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                className="input !w-24 !py-1 text-xs"
                placeholder="0"
                defaultValue={item.value ?? ''}
                onBlur={e => {
                  if (e.target.value !== '') respond(cl, item, Number(e.target.value), false);
                }}
              />
              {item.unit && <span className="text-xs text-slate-400">{item.unit}</span>}
            </div>
          )}
        </div>
        {item.flagged && (
          <div className="mt-2 space-y-2">
            <textarea
              className="input resize-none text-xs"
              rows={2}
              placeholder="Comment required — describe the issue, and add a photo on the request if needed"
              defaultValue={item.comment ?? ''}
              onBlur={e => updateItem(cl, item.id, { comment: e.target.value })}
            />
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => navigate(`/fm/request/new?prefill=${encodeURIComponent(`${cl.title} — ${item.zone ?? 'General'} — ${item.label}: ${item.comment ?? 'flagged during daily walk'}`)}`)}
            >Raise request</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">Daily site walk</h1>
          {site && <span className="badge b-info">{site.name}</span>}
          <span className="badge b-neu">{formatDate(new Date().toISOString())}</span>
        </div>
      )}

      <div className="alert-info flex items-start gap-2">
        <Route size={15} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <span className="text-sm">Items are ordered to match your physical walk route. Rating <strong>Poor</strong> or <strong>Critical</strong> — or marking <strong>Fail</strong> — flags the item and a comment becomes mandatory.</span>
      </div>

      {submitted.length > 0 && (
        <div className="alert-info flex items-center gap-2 !border-emerald-200 !bg-emerald-50">
          <CheckCircle size={15} className="text-emerald-600" />
          <span className="text-sm text-emerald-800">Today's walk for {submitted.map(c => c.title).join(', ')} has already been submitted.</span>
        </div>
      )}

      {walks.map(cl => {
        const done = cl.items.filter(i => i.checked).length;
        const flagged = cl.items.filter(i => i.flagged).length;
        const pct = cl.items.length ? Math.round((done / cl.items.length) * 100) : 0;
        const zones = [...new Set(cl.items.map(i => i.zone ?? 'General'))];

        return (
          <div key={cl.id} className="space-y-3">
            <div className="card p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500 font-semibold">{cl.title} — walk progress <span className="badge b-neu ml-1">{scheduleById.get(cl.id)}</span></span>
                <span className="text-slate-600">{done} of {cl.items.length} items · <span className="text-red-600 font-semibold">{flagged} flagged</span></span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {zones.map(zone => (
              <div key={zone} className="card overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-brand-600">{zone}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {cl.items.filter(i => (i.zone ?? 'General') === zone).map(item => renderItem(cl, item))}
                </div>
              </div>
            ))}

            <button
              className="btn-primary w-full"
              disabled={!walkComplete(cl)}
              onClick={() => currentUser && submitChecklist(cl.id, currentUser.id)}
            >
              <Send size={14} />
              {walkComplete(cl) ? `Submit walk — ${cl.title}` : `Complete all items first (${cl.items.length - done} remaining${flagged ? ', comments required on flagged items' : ''})`}
            </button>
          </div>
        );
      })}

      {walks.length === 0 && submitted.length === 0 && (
        <div className="card p-14 flex flex-col items-center justify-center text-center">
          <Route size={24} className="text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-600">No walk items for today</p>
          <p className="text-xs text-slate-400 mt-1">Configure the daily checklist under Customise or ask a supervisor to build one</p>
        </div>
      )}
    </div>
  );
}
