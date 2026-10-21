import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

const DISMISS_KEY = 'pw_install_dismissed';
const RESHOW_MS = 14 * 24 * 60 * 60 * 1000; // re-offer after 14 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Small dismissible banner suggesting "Add to Home Screen" after login.
// Chrome/Android: uses the native beforeinstallprompt flow.
// iOS Safari: no programmatic prompt exists — shows Share → Add to Home Screen steps.
export default function InstallPrompt() {
  const { currentUser } = useStore();
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - t < RESHOW_MS;
  });

  const nav = navigator as Navigator & { standalone?: boolean };
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!currentUser || isStandalone || dismissed) return null;
  if (!installEvt && !isIos) return null; // nothing actionable to offer

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const { outcome } = await installEvt.userChoice;
    if (outcome === 'accepted') dismiss();
  };

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-[90] card p-4 shadow-xl border border-slate-200">
      <div className="flex items-start gap-3">
        <Download size={16} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Install Propel Works</p>
          <p className="text-xs text-slate-500 mt-0.5">Add to your home screen for one-tap access and push notifications.</p>
          {showIosSteps && (
            <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">
              Tap <Share size={11} className="inline -mt-0.5 text-brand-600" /> <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </p>
          )}
        </div>
        <button onClick={dismiss} className="btn-icon flex-shrink-0" aria-label="Dismiss install prompt">
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        {installEvt && (
          <button onClick={() => void install()} className="btn-primary text-xs flex-1">Install app</button>
        )}
        {isIos && !installEvt && (
          <button onClick={() => setShowIosSteps(s => !s)} className="btn-secondary text-xs flex-1">
            {showIosSteps ? 'Hide steps' : 'How to install'}
          </button>
        )}
        <button onClick={dismiss} className="btn-ghost text-xs">Not now</button>
      </div>
    </div>
  );
}
