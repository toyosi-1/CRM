import { useState } from 'react';
import { Building2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/helpers';

export default function SiteRules() {
  const { sites, updateSite } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { floatLimit: number; pettyCashEnabled: boolean; monthlyBudget: number }>>({});

  const startEdit = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    setDraft(d => ({
      ...d,
      [siteId]: { floatLimit: site.floatLimit, pettyCashEnabled: site.pettyCashEnabled, monthlyBudget: site.monthlyBudget },
    }));
    setEditing(siteId);
  };

  const saveEdit = (siteId: string) => {
    const d = draft[siteId];
    if (!d) return;
    updateSite(siteId, { floatLimit: d.floatLimit, pettyCashEnabled: d.pettyCashEnabled, monthlyBudget: d.monthlyBudget });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Site Rules &amp; Controls</h1>
        <p className="page-subtitle">Manage petty cash settings, float limits, and budget controls per site</p>
      </div>

      <div className="space-y-4">
        {sites.map(site => {
          const isEditing = editing === site.id;
          const d = draft[site.id];
          const utilPct = Math.round((site.currentMonthSpend / site.monthlyBudget) * 100);

          return (
            <div key={site.id} className="card-hover p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Building2 size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{site.name}</h3>
                    <p className="text-xs text-slate-500">{site.address}</p>
                  </div>
                </div>
                {!isEditing ? (
                  <button onClick={() => startEdit(site.id)} className="btn-secondary text-xs py-1.5">
                    Edit Rules
                  </button>
                ) : (
                  <button onClick={() => saveEdit(site.id)} className="btn-success text-xs py-1.5">
                    <Save size={12} /> Save Changes
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Petty Cash */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Petty Cash</p>
                  {isEditing && d ? (
                    <button
                      onClick={() => setDraft(prev => ({ ...prev, [site.id]: { ...prev[site.id], pettyCashEnabled: !prev[site.id].pettyCashEnabled } }))}
                      className="flex items-center gap-2"
                    >
                      {d.pettyCashEnabled
                        ? <ToggleRight size={28} className="text-emerald-500" />
                        : <ToggleLeft size={28} className="text-slate-400" />
                      }
                      <span className={`text-sm font-semibold ${d.pettyCashEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {d.pettyCashEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  ) : (
                    <div className={`flex items-center gap-2`}>
                      {site.pettyCashEnabled
                        ? <ToggleRight size={28} className="text-emerald-500" />
                        : <ToggleLeft size={28} className="text-slate-400" />
                      }
                      <span className={`text-sm font-semibold ${site.pettyCashEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {site.pettyCashEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Float Limit */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Float Limit</p>
                  {isEditing && d ? (
                    <input
                      type="number"
                      value={d.floatLimit}
                      onChange={e => setDraft(prev => ({ ...prev, [site.id]: { ...prev[site.id], floatLimit: Number(e.target.value) } }))}
                      className="input text-sm font-bold"
                    />
                  ) : (
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(site.floatLimit)}</p>
                  )}
                </div>

                {/* Monthly Budget */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Monthly Budget</p>
                  {isEditing && d ? (
                    <input
                      type="number"
                      value={d.monthlyBudget}
                      onChange={e => setDraft(prev => ({ ...prev, [site.id]: { ...prev[site.id], monthlyBudget: Number(e.target.value) } }))}
                      className="input text-sm font-bold"
                    />
                  ) : (
                    <>
                      <p className="text-xl font-bold text-slate-800">{formatCurrency(site.monthlyBudget)}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{formatCurrency(site.currentMonthSpend)} spent</span>
                          <span>{utilPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${utilPct >= 90 ? 'bg-red-500' : utilPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(utilPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
