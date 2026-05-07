import { AlertTriangle, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
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

  const barColor =
    level === 'danger'  ? '#ef4444' :
    level === 'warning' ? '#f59e0b' :
                          '#10b981';

  const tonalBg =
    level === 'danger'  ? 'rgba(239,68,68,0.1)' :
    level === 'warning' ? 'rgba(245,158,11,0.1)' :
                          'rgba(16,185,129,0.1)';

  const textColor =
    level === 'danger'  ? 'text-red-600' :
    level === 'warning' ? 'text-amber-600' :
                          'text-emerald-600';

  const iconColor =
    level === 'danger'  ? '#ef4444' :
    level === 'warning' ? '#f59e0b' :
                          '#10b981';

  /* ── Compact mode ───────────────────── */
  if (compact) {
    return (
      <div className="rounded-2xl p-3 border transition-all duration-200"
        style={{ background: tonalBg, borderColor: `${barColor}22` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Budget</span>
          <span className={`text-xs font-black ${textColor}`}>{utilizationPct}%</span>
        </div>
        {/* Segmented bar */}
        <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(utilizationPct, 100)}%`, background: barColor }} />
        </div>
        {level !== 'safe' && (
          <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-semibold ${textColor}`}>
            <AlertTriangle size={10} />
            {level === 'danger' ? 'Nearly exhausted' : 'Approaching limit'}
          </div>
        )}
      </div>
    );
  }

  /* ── Full mode ───────────────────────── */
  const spentPct = Math.min(utilizationPct, 100);
  const remainPct = 100 - spentPct;

  /* SVG donut ring values */
  const r = 36;
  const circ = 2 * Math.PI * r;
  const spentDash = (spentPct / 100) * circ;

  return (
    <div className="card-elevated p-5">

      {/* ── Header ─── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Budget</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(budget)}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
          style={{ background: tonalBg }}>
          {level !== 'safe'
            ? <AlertTriangle size={18} style={{ color: iconColor }} />
            : <Wallet size={18} style={{ color: iconColor }} />
          }
        </div>
      </div>

      {/* ── Donut ring + centre stat ─── */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            {/* Track */}
            <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            {/* Spent arc */}
            <circle
              cx="44" cy="44" r={r}
              fill="none"
              stroke={barColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${spentDash} ${circ - spentDash}`}
              strokeDashoffset={circ / 4}
              style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-base font-black ${textColor}`}>{utilizationPct}%</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">used</span>
          </div>
        </div>

        {/* Spend rows */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                <span className="text-[11px] font-bold text-slate-500">Spent</span>
              </div>
              <span className="text-sm font-black text-slate-800">{formatCurrency(spent)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-700"
                style={{ width: `${spentPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: barColor }} />
                <span className="text-[11px] font-bold text-slate-500">Remaining</span>
              </div>
              <span className={`text-sm font-black ${textColor}`}>{formatCurrency(remaining)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${remainPct}%`, background: barColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tonal alert footer ─── */}
      {level !== 'safe' ? (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold"
          style={{ background: tonalBg, color: iconColor }}>
          <TrendingUp size={13} />
          <span className="flex-1">
            {level === 'danger' ? 'Budget critically low — new requests may be blocked' : 'Above 75% — monitor spend closely'}
          </span>
          <ArrowUpRight size={13} className="flex-shrink-0 opacity-60" />
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-emerald-700"
          style={{ background: 'rgba(16,185,129,0.08)' }}>
          <Wallet size={13} />
          <span>Budget on track — {remainPct}% available</span>
        </div>
      )}
    </div>
  );
}
