import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('PUSH_SECRET');
  if (!secret || request.headers.get('x-push-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!publicKey || !privateKey || !url || !serviceKey) {
    return new Response('Push is not configured', { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const profileId = String(body?.profileId ?? '');
  if (!profileId) return new Response('profileId required', { status: 400 });

  webpush.setVapidDetails('mailto:support@propelpfm.com', publicKey, privateKey);
  const admin = createClient(url, serviceKey);
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('profile_id', profileId);
  if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });

  const payload = JSON.stringify({ title: body.title ?? 'Propel Works', body: body.body ?? '', link: body.link ?? '/' });
  const dead: string[] = [];

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) dead.push(sub.id);
    }
  }));

  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
  return new Response(JSON.stringify({ sent: subs.length - dead.length, removed: dead.length }), { headers: { 'Content-Type': 'application/json' } });
});
