-- GlassHouseERP v13 spec gap: PPM contract intelligence, reconciliation, facility types

-- PPM contract fields (spec §4.5 / §5.3)
alter table public.ppm_schedules add column if not exists contract_start date;
alter table public.ppm_schedules add column if not exists contract_end date;
alter table public.ppm_schedules add column if not exists visits_included integer check (visits_included is null or visits_included >= 0);
alter table public.ppm_schedules add column if not exists approx boolean not null default false;
alter table public.ppm_schedules add column if not exists plan_dates jsonb not null default '[]'::jsonb;
alter table public.ppm_schedules add column if not exists service_history jsonb not null default '[]'::jsonb;
alter table public.ppm_schedules add column if not exists notes text not null default '';

-- frequency_months = 0 means "per contract schedule" (dates come from plan_dates)
alter table public.ppm_schedules drop constraint if exists ppm_schedules_frequency_months_check;
alter table public.ppm_schedules add constraint ppm_schedules_frequency_months_check check (frequency_months >= 0);

-- FMs manage PPM rows for their own sites (mark done / defer / edit / raise work order)
create policy ppm_fm_manage on public.ppm_schedules for all to authenticated
  using (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()))
  with check (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()));

-- Reconciliation state on executed payments (spec §5.6)
alter table public.requests add column if not exists recon_status text check (recon_status in ('confirmed', 'flagged'));
alter table public.requests add column if not exists recon_note text;
alter table public.requests add column if not exists recon_by text;

-- Standalone reconciliation entries — debits that left the account with no work order
create table if not exists public.reconciliation_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  reference text not null,
  payee text not null,
  site_id text references public.sites(id) on delete set null,
  amount numeric(14,2) not null,
  state text not null default 'exception' check (state in ('confirmed', 'pending', 'exception')),
  note text not null default '',
  recorded_by text not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.reconciliation_entries enable row level security;
create policy recon_read on public.reconciliation_entries for select to authenticated
  using (public.current_role() in ('finance', 'admin'));
create policy recon_finance_write on public.reconciliation_entries for all to authenticated
  using (public.current_role() = 'finance') with check (public.current_role() = 'finance');
alter publication supabase_realtime add table public.reconciliation_entries;

-- Facility types per spec §4.2
alter table public.sites drop constraint if exists sites_site_type_check;
update public.sites set site_type = 'Full residential building' where site_type = 'residential';
update public.sites set site_type = 'Single floor within a building' where site_type = 'commercial';
update public.sites set site_type = 'Gated estate — multiple structures' where site_type = 'estate';
update public.sites set site_type = 'Mixed use — residential and commercial' where site_type = 'mixed_use';
alter table public.sites add constraint sites_site_type_check check (site_type in (
  'Full residential building',
  'Single unit — multiple floors',
  'Single floor within a building',
  'Selected units within a building',
  'Full commercial building — multiple floors',
  'Mixed use — residential and commercial',
  'Gated estate — multiple structures'
));
