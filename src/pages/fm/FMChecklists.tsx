import { useState } from 'react';
import { CheckSquare, Square, Send, Clock, Flag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ChecklistItem } from '../../types';
import { formatDate, formatDateTime } from '../../utils/helpers';
import FMDailyWalk from './FMDailyWalk';
import ChecklistBuilder from '../supervisor/ChecklistBuilder';

const CHECKLIST_ICONS: Record<string, string> = {
  generator_walkaround: '⚡',
  facility_inspection: '🏢',
  safety_inspection: '🔒',
  ppm: '🔧',
};

function SectionTabs({ tabs, section, onChange }: { tabs: { key: 'walk' | 'all' | 'builder'; label: string }[]; section: string; onChange: (k: 'walk' | 'all' | 'builder') => void }) {
  return (
    <div className="flex gap-1 border-b" style={{ borderColor: 'var(--gh-border)' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-3 py-2 text-xs font-semibold transition-colors ${section === t.key ? 'border-b-2' : 'text-slate-400 hover:text-slate-600'}`}
          style={section === t.key ? { borderColor: 'var(--acc)', color: 'var(--green)' } : undefined}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function FMChecklists({ roleFilter }: { roleFilter?: 'fm' | 'tech' }) {
  const [section, setSection] = useState<'walk' | 'all' | 'builder'>('walk');
  const { currentUser, checklists, users, saveChecklist, submitChecklist, activeSiteId } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const [activeId, setActiveId] = useState<string | null>(null);

  const myChecklists = checklists
    .filter(c => c.siteId === siteId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const toggleItem = (checklistId: string, itemId: string) => {
    const cl = myChecklists.find(c => c.id === checklistId);
    if (!cl || cl.submittedToAdmin) return;
    const updated: ChecklistItem[] = cl.items.map(item =>
      item.id === itemId
        ? { ...item, checked: !item.checked, timestamp: !item.checked ? new Date().toISOString() : undefined }
        : item
    );
    saveChecklist(checklistId, updated);
  };

  const handleSubmit = (checklistId: string) => {
    if (!currentUser) return;
    submitChecklist(checklistId, currentUser.id);
    setActiveId(null);
  };

  const tabs: { key: 'walk' | 'all' | 'builder'; label: string }[] = [
    { key: 'walk', label: 'Daily walk' },
    { key: 'all', label: 'All checklists' },
    ...(roleFilter ? [] : [{ key: 'builder' as const, label: 'Builder' }]),
  ];

  if (section === 'walk') {
    return (
      <div className="space-y-5">
        <SectionTabs tabs={tabs} section={section} onChange={setSection} />
        <FMDailyWalk embedded />
      </div>
    );
  }
  if (section === 'builder') {
    return (
      <div className="space-y-5">
        <SectionTabs tabs={tabs} section={section} onChange={setSection} />
        <ChecklistBuilder />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTabs tabs={tabs} section={section} onChange={setSection} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {myChecklists.map(cl => {
          const visibleItems = roleFilter ? cl.items.filter(i => !i.role || i.role === roleFilter || i.role === 'both') : cl.items;
          const checkedCount = visibleItems.filter(i => i.checked).length;
          const pct = visibleItems.length ? Math.round((checkedCount / visibleItems.length) * 100) : 0;
          const allDone = cl.items.every(i => i.checked);
          const isActive = activeId === cl.id;

          return (
            <div key={cl.id} className="card overflow-hidden">
              {/* Header */}
              <div
                className="p-4 flex items-start justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setActiveId(isActive ? null : cl.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{CHECKLIST_ICONS[cl.type] ?? '📋'}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{cl.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(cl.createdAt)} · {checkedCount}/{visibleItems.length} items complete</p>
                  </div>
                </div>
                <span className={`badge ${cl.submittedToAdmin ? 'bg-emerald-100 text-emerald-700' : pct === 100 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {cl.submittedToAdmin ? 'Submitted' : pct === 100 ? 'Ready' : `${pct}%`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="px-4 pb-3">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${cl.submittedToAdmin ? 'from-emerald-400 to-emerald-500' : pct === 100 ? 'from-amber-400 to-orange-400' : 'from-brand-500 to-brand-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Submitted info */}
              {cl.submittedToAdmin && cl.completedAt && (
                <div className="px-4 pb-4 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <Clock size={11} />
                  <span>
                    Submitted {formatDate(cl.completedAt)}
                    {cl.completedBy && ` · ${users.find(u => u.id === cl.completedBy)?.name ?? 'FM'}`}
                  </span>
                </div>
              )}

              {/* Expanded items — read-only once submitted */}
              {isActive && (
                <div className="border-t border-slate-100">
                  <div className="divide-y divide-slate-100">
                    {visibleItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${cl.submittedToAdmin ? '' : 'cursor-pointer hover:bg-brand-50/40'} ${item.checked ? 'opacity-60' : ''}`}
                        onClick={() => toggleItem(cl.id, item.id)}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {item.checked
                            ? <CheckSquare size={17} className="text-emerald-500" />
                            : <Square size={17} className="text-slate-300" />
                          }
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {item.label}
                          </p>
                          {item.checked && item.timestamp && (
                            <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1 font-medium">
                              <Clock size={10} /> Done · {formatDateTime(item.timestamp)}
                            </p>
                          )}
                          {item.value !== undefined && item.value !== '' && (
                            <p className="text-xs text-slate-500 mt-0.5">Reading: {item.value}{item.unit ? ` ${item.unit}` : ''}</p>
                          )}
                          {item.comment && (
                            <p className="text-xs text-slate-500 mt-0.5">{item.comment}</p>
                          )}
                        </div>
                        {item.flagged && <Flag size={13} className="text-amber-500 flex-shrink-0 mt-1" />}
                      </div>
                    ))}
                  </div>
                  {!cl.submittedToAdmin && (
                    <div className="p-4 border-t border-slate-100 flex gap-3">
                      <button
                        onClick={() => handleSubmit(cl.id)}
                        disabled={!allDone}
                        className="btn-primary w-full disabled:opacity-40"
                      >
                        <Send size={14} />
                        {!allDone ? `Complete all items first (${cl.items.filter(i => !i.checked).length} remaining)` : 'Submit to Admin'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {myChecklists.length === 0 && (
          <div className="col-span-2 card p-14 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <CheckSquare size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-600">No checklists assigned</p>
            <p className="text-xs text-slate-400 mt-1">Your supervisor will assign checklists to your site</p>
          </div>
        )}
      </div>
    </div>
  );
}
