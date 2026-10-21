-- Acting FM handover (spec §5.8) + vendor SLA response clocks (spec §5.11)

alter table public.profiles add column if not exists acting_for_profile_id text references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists acting_start date;
alter table public.profiles add column if not exists acting_end date;
alter table public.profiles add column if not exists acting_handover jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists acting_acknowledged_at timestamptz;

alter table public.requests add column if not exists vendor_attended_at timestamptz;

-- An active acting assignment temporarily grants the acting FM the covered FM's
-- sites. Access reverts automatically once acting_end passes.
create or replace function public.current_site_ids()
returns text[] language sql stable security definer set search_path = public
as $$
  select
    coalesce(me.site_ids, '{}'::text[])
    || case when me.site_id is null then '{}'::text[] else array[me.site_id]::text[] end
    || coalesce((
        select array_agg(distinct s) from (
          select unnest(covering.site_ids || array[covering.site_id]) as s
          from public.profiles covering
          where covering.acting_for_profile_id = me.id
            and covering.acting_start <= current_date
            and covering.acting_end >= current_date
        ) t
      ), '{}'::text[])
  from public.profiles me where me.auth_user_id = auth.uid() and me.active = true limit 1
$$;

-- FM logs the vendor's first on-site attendance; stops the SLA response clock.
create or replace function public.mark_vendor_attended(p_request_id text)
returns void language plpgsql security definer set search_path = public
as $$
declare req public.requests;
begin
  select * into req from public.requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if public.current_role() <> 'facility_manager' or not (req.site_id = any(public.current_site_ids())) then
    raise exception 'Only the facility manager for this site can log vendor attendance';
  end if;
  if req.vendor_id is null then raise exception 'No vendor assigned to this request'; end if;
  if req.vendor_attended_at is not null then raise exception 'Vendor attendance already recorded'; end if;
  update public.requests set vendor_attended_at = now() where id = p_request_id;
end;
$$;
