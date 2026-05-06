import { useState } from 'react';
import { CheckSquare, Square, Send, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ChecklistItem } from '../../types';
import { formatDate } from '../../utils/helpers';

const CHECKLIST_ICONS: Record<string, string> = {
  generator_walkaround: '⚡',
  facility_inspection: '🏢',
  safety_inspection: '🔒',
  ppm: '🔧',
};

export default function FMChecklists() {
  const { currentUser, checklists, saveChecklist, submitChecklist } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const myChecklists = checklists.filter(c => c.siteId === currentUser?.siteId);

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Facility Checklists</h1>
        <p className="page-subtitle">Complete all items then submit to Admin · {myChecklists.filter(c => !c.submittedToAdmin).length} pending</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {myChecklists.map(cl => {
          const checkedCount = cl.items.filter(i => i.checked).length;
          const pct = Math.round((checkedCount / cl.items.length) * 100);
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
                    <p className="text-xs text-slate-500 mt-0.5">{checkedCount}/{cl.items.length} items complete</p>
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
                  <span>Submitted {formatDate(cl.completedAt)}</span>
                </div>
              )}

              {/* Expanded items */}
              {isActive && !cl.submittedToAdmin && (
                <div className="border-t border-slate-100">
                  <div className="divide-y divide-slate-100">
                    {cl.items.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-brand-50/40 transition-colors ${item.checked ? 'opacity-60' : ''}`}
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
                              <Clock size={10} /> Done · {formatDate(item.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-slate-100 flex gap-3">
                    <button
                      onClick={() => handleSubmit(cl.id)}
                      disabled={pct < 100}
                      className="btn-primary w-full disabled:opacity-40"
                    >
                      <Send size={14} />
                      {pct < 100 ? `Complete all items first (${cl.items.length - checkedCount} remaining)` : 'Submit to Admin'}
                    </button>
                  </div>
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
