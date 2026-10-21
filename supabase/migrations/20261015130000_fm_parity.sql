-- FM workspace parity with the GlassHouseERP v12 reference
alter table public.requests add column if not exists is_incident boolean not null default false;
alter table public.vendors add column if not exists sla_start_date date;
alter table public.vendors add column if not exists sla_expiry_date date;

-- Facility managers may customise checklist templates for their own sites
create policy checklist_templates_fm_manage on public.checklist_templates
  for all to authenticated
  using (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()))
  with check (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()));
