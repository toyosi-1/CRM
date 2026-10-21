drop policy if exists profiles_self_update on public.profiles;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id text references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs(actor_profile_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

alter table public.audit_logs enable row level security;

create policy audit_logs_admin_read on public.audit_logs
for select to authenticated
using (public.current_role() = 'admin');

create or replace function public.record_audit_log(
  target_action text,
  target_entity_type text,
  target_entity_id text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_id uuid;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Administrator access required';
  end if;

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, metadata)
  values (public.current_profile_id(), target_action, target_entity_type, target_entity_id, target_metadata)
  returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.record_audit_log(text, text, text, jsonb) from public;
grant execute on function public.record_audit_log(text, text, text, jsonb) to authenticated;
