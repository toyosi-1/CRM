import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(VAPID_PUBLIC_KEY);
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function enablePushNotifications(profileId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: 'This browser does not support push notifications.' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission === 'denied' ? 'Notifications are blocked in browser settings.' : 'Permission not granted.' };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!).buffer as ArrayBuffer });
  const key = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  if (!key || !auth) return { ok: false, reason: 'Subscription keys unavailable.' };
  const { error } = await supabase.from('push_subscriptions').upsert({
    profile_id: profileId,
    endpoint: sub.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
    auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
  }, { onConflict: 'endpoint' });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
