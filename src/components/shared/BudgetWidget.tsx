import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency, budgetWarningLevel } from '../../utils/helpers';

interface Props {
  budget: number;
  spent: number;
  remaining: number;
  utilizationPct: number;
  compact?: boolean;
}

export default function BudgetWidget({ budget, spent, remaining, utilizationPct, compact }: Props) {
  const level = budgetWarningLevel(utilizationPct);
  const barGradient =
    level === 'danger'  ? 'from-red-500 to-red-600' :
    level === 'warning' ? 'from-amber-400 to-orange-500' :
                          'from-emerald-400 to-emerald-500';
  const textColor =
    level === 'danger'  ? 'text-red-600' :
    level === 'warning' ? 'text-amber-600' :
                          'text-emerald-600';
  const ringColor =
    level === 'danger'  ? 'ring-red-200 bg-red-50' :
    level === 'warning' ? 'ring-amber-200 bg-amber-50' :
                          'ring-emerald-200 bg-emerald-50';

  if (compact) {
    return (
      <div className={`rounded-xl border px-3 py-2.5 ${level === 'danger' ? 'bg-red-50 border-red-200' : level === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Budget</span>
          <span className={`text-xs font-extrabold ${textColor}`}>{utilizationPct}%</span>
        </div>
        <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700`}
            style={{ width: `${Math.min(utilizationPct, 100)}%` }}
          />
        </div>
        {level !== 'safe' && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${textColor}`}>
            <AlertTriangle size={10} />
            {level === 'danger' ? 'Budget nearly exhausted' : 'Approaching budget limit'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="label">Monthly Budget</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">{formatCurrency(budget)}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${ringColor}`}>
          {level !== 'safe' ? (
            <AlertTriangle size={18} className={textColor} />
          ) : (
            <Wallet size={18} className="text-emerald-600" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(utilizationPct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-slate-400 font-medium">{utilizationPct}% utilized</span>
          {level !== 'safe' && (
            <span className={`text-xs font-bold ${textColor} flex items-center gap-1`}>
              <AlertTriangle size={10} />
              {level === 'danger' ? 'Critical' : 'Warning'}
            </span>
          )}
        </div>
      </div>

      {/* Spend breakdown */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="text-xs text-slate-500 font-medium">Spent</span>
          </div>
          <span className="text-sm font-bold text-slate-800">{formatCurrency(spent)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${level === 'danger' ? 'bg-red-400' : level === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-xs text-slate-500 font-medium">Remaining</span>
          </div>
          <span className={`text-sm font-bold ${textColor}`}>{formatCurrency(remaining)}</span>
        </div>
      </div>

      {level !== 'safe' && (
        <div className={`mt-3 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${level === 'danger' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
          <TrendingUp size={12} />
          {level === 'danger' ? 'Budget critically low — new requests may be blocked' : 'Budget utilization above 75% — monitor spend'}
        </div>
      )}
    </div>
  );
}
