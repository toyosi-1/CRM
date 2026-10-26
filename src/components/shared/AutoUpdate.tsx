import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registers the service worker and actively polls for new builds.
 * With registerType 'autoUpdate' a newly detected build activates
 * immediately and every controlled tab reloads — no user action needed.
 */
export default function AutoUpdate() {
  useRegisterSW({
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
  return null;
}
