import { Clock, User } from 'lucide-react';
import type { AuditEntry } from '../../types';
import { RoleBadge } from './Badges';
import { formatDateTime } from '../../utils/helpers';

export default function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => (
        <div key={entry.id} className="relative flex gap-4">
          {/* Connector line */}
          {idx < entries.length - 1 && (
            <div className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200 z-0" />
          )}
          {/* Circle */}
          <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center mt-1">
            <User size={14} className="text-slate-500" />
          </div>
          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-slate-900">{entry.userName}</span>
              <RoleBadge role={entry.userRole} />
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">{entry.department}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-2">{entry.action}</p>
            {entry.comment && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 mb-2">
                <strong>Comment:</strong> {entry.comment}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Clock size={11} />
                <span>{formatDateTime(entry.timestamp)}</span>
              </div>
              {entry.tatHours !== undefined && entry.tatHours > 0 && (
                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 font-medium">
                  TAT: {entry.tatHours}h
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
