-- Technician work orders: requests can be routed to a technician.
alter table public.requests
  add column if not exists assigned_to text references public.profiles(id) on delete set null;

create index if not exists requests_assigned_idx on public.requests(assigned_to);

-- FMs (own sites), supervisors and admins route a request to a technician.
-- Security definer: FMs have no direct UPDATE policy on requests.
create or replace function public.assign_technician(p_request_id text, p_technician_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.current_role();
  v_site text;
begin
  if v_role not in ('facility_manager', 'supervisor', 'admin') then
    raise exception 'Not authorised to assign technicians';
  end if;

  select site_id into v_site from public.requests where id = p_request_id;
  if v_site is null then raise exception 'Request not found'; end if;

  if v_role = 'facility_manager' and not (v_site = any(public.current_site_ids())) then
    raise exception 'Request is not at your facility';
  end if;

  if p_technician_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = p_technician_id and p.role = 'technician' and p.active is not false
  ) then
    raise exception 'Not an active technician';
  end if;

  update public.requests set assigned_to = p_technician_id where id = p_request_id;
end;
$$;

grant execute on function public.assign_technician(text, text) to authenticated;
