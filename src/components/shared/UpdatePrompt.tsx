import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[100] card p-4 flex items-center gap-3 shadow-xl border border-slate-200">
      <RefreshCw size={16} className="text-brand-600 flex-shrink-0" />
      <p className="text-sm font-semibold text-slate-700 flex-1">A new version is available.</p>
      <button onClick={() => void updateServiceWorker(true)} className="btn-primary text-xs">
        Update
      </button>
      <button onClick={() => setNeedRefresh(false)} className="btn-icon" aria-label="Dismiss update">
        <X size={14} />
      </button>
    </div>
  );
}
