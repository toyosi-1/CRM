-- Push notification subscriptions + trigger to dispatch web push on new notifications
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own_insert on public.push_subscriptions;
create policy push_subscriptions_own_insert on public.push_subscriptions for insert to authenticated
  with check (profile_id = public.current_profile_id());

drop policy if exists push_subscriptions_own_read on public.push_subscriptions;
create policy push_subscriptions_own_read on public.push_subscriptions for select to authenticated
  using (profile_id = public.current_profile_id());

drop policy if exists push_subscriptions_own_delete on public.push_subscriptions;
create policy push_subscriptions_own_delete on public.push_subscriptions for delete to authenticated
  using (profile_id = public.current_profile_id());

-- Dispatch a web push whenever a notification row is created
create extension if not exists pg_net;

create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://zibibvbhzzkfqrzzhhgt.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', '3b28d0a7d4c470211fab830c99779c746265938811356e0a60a523677aa2dd96'
    ),
    body := jsonb_build_object(
      'profileId', NEW.profile_id,
      'title', NEW.title,
      'body', NEW.body,
      'link', NEW.link
    )
  );
  return NEW;
end;
$$;

drop trigger if exists notifications_push_dispatch on public.notifications;
create trigger notifications_push_dispatch
  after insert on public.notifications
  for each row execute function public.dispatch_push_notification();
