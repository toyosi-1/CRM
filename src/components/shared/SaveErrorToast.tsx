import { useStore } from '../../store/useStore';
import { AlertTriangle, X } from 'lucide-react';

export default function SaveErrorToast() {
  const { saveError, clearSaveError } = useStore();
  if (!saveError) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 z-[100] card p-4 flex items-center gap-3 shadow-xl border border-red-200 bg-red-50">
      <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
      <p className="text-sm font-semibold text-red-700 flex-1">{saveError}</p>
      <button onClick={clearSaveError} className="btn-icon" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
