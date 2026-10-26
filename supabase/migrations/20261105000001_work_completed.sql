-- Vendor SLA scoring: clock runs from payment (per-service) to FM-confirmed
-- work completion. FM has no direct UPDATE policy on requests, so go through
-- a guarded RPC like mark_vendor_attended.
alter table public.requests
  add column if not exists work_completed_at timestamptz;

create or replace function public.mark_work_completed(p_request_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.current_role();
  v_site text;
  v_status public.request_status;
begin
  if v_role not in ('facility_manager', 'admin') then
    raise exception 'Only the facility manager or admin can confirm work completion';
  end if;

  select site_id, status into v_site, v_status from public.requests where id = p_request_id;
  if v_site is null then raise exception 'Request not found'; end if;

  if v_role = 'facility_manager' and not (v_site = any(public.current_site_ids())) then
    raise exception 'Request is not at your facility';
  end if;

  if v_status <> 'PAID' then
    raise exception 'Work can only be confirmed complete after payment';
  end if;

  update public.requests
  set work_completed_at = coalesce(work_completed_at, now())
  where id = p_request_id;
end;
$$;

grant execute on function public.mark_work_completed(text) to authenticated;
