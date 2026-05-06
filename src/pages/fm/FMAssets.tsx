import { useNavigate } from 'react-router-dom';
import { Package, Calendar, Wrench, DollarSign, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function FMAssets() {
  const navigate = useNavigate();
  const { currentUser, assets } = useStore();
  const siteAssets = assets.filter(a => a.siteId === currentUser?.siteId);

  const STATUS_CONFIG = {
    operational:    { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: 'bg-emerald-50', label: 'Operational' },
    under_repair:   { badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',   icon: 'bg-amber-50',   label: 'Under Repair' },
    decommissioned: { badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500',     icon: 'bg-red-50',     label: 'Decommissioned' },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Site Assets</h1>
          <p className="page-subtitle">{siteAssets.length} assets registered · {siteAssets.filter(a => a.status === 'under_repair').length} under repair</p>
        </div>
        <button onClick={() => navigate('/fm/request/new')} className="btn-secondary">
          <Plus size={14} /> Log Issue
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {siteAssets.map(asset => {
          const sc = STATUS_CONFIG[asset.status];
          return (
          <div key={asset.id} className="card-hover p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${sc.icon} flex items-center justify-center flex-shrink-0`}>
                  <Package size={17} className={sc.dot.replace('bg-', 'text-')} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">{asset.name}</h3>
                  <span className={`badge mt-1.5 ${sc.badge}`}>
                    <span className={`badge-dot ${sc.dot}`} />
                    {sc.label}
                  </span>
                </div>
              </div>
              <button onClick={() => navigate('/fm/request/new')} className="btn-ghost text-xs text-brand-600 hover:bg-brand-50">
                <Plus size={12} /> Log Issue
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={13} />
                <span className="text-xs">Installed {formatDate(asset.installationDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Wrench size={13} />
                <span className="text-xs">Last repair {formatDate(asset.lastRepairDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 col-span-2">
                <DollarSign size={13} />
                <span className="text-xs">Total repair cost: <strong className="text-slate-700">{formatCurrency(asset.totalRepairCost)}</strong></span>
              </div>
            </div>

            {asset.maintenanceHistory.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="label mb-2">Recent Maintenance</p>
                <div className="space-y-2">
                  {asset.maintenanceHistory.slice(0, 2).map(record => (
                    <div key={record.id} className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{record.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(record.date)}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-600">{formatCurrency(record.cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        })}

        {siteAssets.length === 0 && (
          <div className="col-span-2 card p-14 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Package size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-600">No assets registered</p>
            <p className="text-xs text-slate-400 mt-1">Assets are managed by your Admin</p>
          </div>
        )}
      </div>
    </div>
  );
}
