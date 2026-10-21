-- Clean up checklist data: keep only the two imported OSD templates, remove all instances.
delete from public.checklists where site_id <> 'SITE-OSD';
delete from public.checklists where site_id = 'SITE-OSD' and title not in ('OSD daily rounds — security guard', 'OSD visit-day rounds — FM');

delete from public.checklist_templates where site_id <> 'SITE-OSD';
delete from public.checklist_templates where site_id = 'SITE-OSD' and id not in (
  'bea27f40-d0ba-46b4-8526-d3e3fdaedfbc',
  'b8d671d6-a694-44fb-8f4f-7f0243526e15'
);

-- Facility-specific vendor SLAs.
create table if not exists public.facility_vendor_slas (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  vendor_id text not null references public.vendors(id) on delete cascade,
  category text not null default '',
  response_sla_hours integer not null check (response_sla_hours > 0),
  start_date date,
  expiry_date date,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facility_vendor_slas_site_idx on public.facility_vendor_slas(site_id);
create index if not exists facility_vendor_slas_vendor_idx on public.facility_vendor_slas(vendor_id);

drop trigger if exists facility_vendor_slas_updated on public.facility_vendor_slas;
create trigger facility_vendor_slas_updated before update on public.facility_vendor_slas
  for each row execute function public.set_updated_at();

-- Drop old vendor-level SLA columns and the guard that prevented FM vendor edits.
drop trigger if exists vendors_fm_guard on public.vendors;
drop function if exists public.guard_fm_vendor_update();

alter table public.vendors drop column if exists response_sla_hours;
alter table public.vendors drop column if exists sla_start_date;
alter table public.vendors drop column if exists sla_expiry_date;
alter table public.vendors drop column if exists sla_document_url;

-- Vendor policies: facility managers can now manage the shared vendor directory.
alter table public.facility_vendor_slas enable row level security;

drop policy if exists facility_vendor_slas_read on public.facility_vendor_slas;
create policy facility_vendor_slas_read on public.facility_vendor_slas for select to authenticated using (true);

drop policy if exists facility_vendor_slas_fm_manage on public.facility_vendor_slas;
create policy facility_vendor_slas_fm_manage on public.facility_vendor_slas for all to authenticated
  using (public.current_role() in ('facility_manager', 'supervisor', 'admin') and (public.current_role() <> 'facility_manager' or site_id = any(public.current_site_ids())))
  with check (public.current_role() in ('facility_manager', 'supervisor', 'admin') and (public.current_role() <> 'facility_manager' or site_id = any(public.current_site_ids())));

drop policy if exists vendors_fm_sla_update on public.vendors;

drop policy if exists vendors_manage on public.vendors;
create policy vendors_manage on public.vendors for all to authenticated
  using (public.current_role() in ('facility_manager', 'procurement', 'admin'))
  with check (public.current_role() in ('facility_manager', 'procurement', 'admin'));

-- Technician creation no longer sends email invites; profiles table keeps a notes field for FM reference.
alter table public.profiles add column if not exists notes text not null default '';
