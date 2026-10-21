-- Multi-site assignment: profiles can belong to multiple facilities.
alter table public.profiles add column if not exists site_ids text[] not null default '{}';

update public.profiles set site_ids = array[site_id] where site_id is not null and site_ids = '{}';

create or replace function public.current_site_ids()
returns text[] language sql stable security definer set search_path = public
as $$
  select coalesce(site_ids, '{}'::text[]) || case when site_id is null then '{}'::text[] else array[site_id]::text[] end
  from public.profiles where auth_user_id = auth.uid() and active = true limit 1
$$;

-- Replace single-site checks with membership checks in site-scoped policies.
drop policy if exists requests_read on public.requests;
create policy requests_read on public.requests for select to authenticated
  using (public.current_role() <> 'facility_manager' or site_id = any(public.current_site_ids()));

drop policy if exists requests_create on public.requests;
create policy requests_create on public.requests for insert to authenticated
  with check (public.current_role() = 'facility_manager' and submitted_by = public.current_profile_id() and site_id = any(public.current_site_ids()));

drop policy if exists checklists_read on public.checklists;
create policy checklists_read on public.checklists for select to authenticated
  using (public.current_role() <> 'facility_manager' or site_id = any(public.current_site_ids()));

drop policy if exists checklists_fm_write on public.checklists;
create policy checklists_fm_write on public.checklists for all to authenticated
  using (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()))
  with check (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()));

drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents for select to authenticated
  using (public.current_role() <> 'facility_manager' or site_id = any(public.current_site_ids()));

drop policy if exists incidents_site_write on public.incidents;
create policy incidents_site_write on public.incidents for all to authenticated
  using (public.current_role() in ('facility_manager', 'technician', 'admin') and (public.current_role() = 'admin' or site_id = any(public.current_site_ids())))
  with check (public.current_role() in ('facility_manager', 'technician', 'admin') and (public.current_role() = 'admin' or site_id = any(public.current_site_ids())));

drop policy if exists petty_read on public.petty_cash_entries;
create policy petty_read on public.petty_cash_entries for select to authenticated
  using (public.current_role() in ('finance', 'admin') or site_id = any(public.current_site_ids()));

drop policy if exists petty_fm_create on public.petty_cash_entries;
create policy petty_fm_create on public.petty_cash_entries for insert to authenticated
  with check (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()) and recorded_by = public.current_profile_id());

drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants for select to authenticated
  using (public.current_role() in ('admin', 'supervisor', 'finance') or site_id = any(public.current_site_ids()));
