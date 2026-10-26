import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// A reload is safe only when no one is mid-entry — check for a focused
// field or any filled form element before applying an update.
function formInProgress(): boolean {
  const active = document.activeElement;
  if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return true;
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea'))
    .some(el => el.value.trim() !== '');
}

/**
 * Registers the service worker, polls for new builds, and applies them
 * automatically — but defers the reload while a user is typing so a
 * deploy can never wipe an in-progress login or form.
 */
export default function AutoUpdate() {
  const deferred = useRef(false);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => void registration.update();
      const interval = window.setInterval(check, 60_000);
      const onVisible = () => {
        if (document.visibilityState === 'visible') check();
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        window.clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisible);
      };
    },
  });

  useEffect(() => {
    if (!needRefresh || deferred.current) return;
    if (!formInProgress()) {
      void updateServiceWorker(true);
      return;
    }
    // Defer until the user finishes typing — retry every 5s.
    deferred.current = true;
    const retry = window.setInterval(() => {
      if (!formInProgress()) {
        window.clearInterval(retry);
        void updateServiceWorker(true);
      }
    }, 5_000);
    return () => { window.clearInterval(retry); deferred.current = false; };
  }, [needRefresh, updateServiceWorker]);

  return null;
}
