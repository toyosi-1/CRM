create table if not exists public.fm_reports (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  period text not null,
  payload jsonb not null,
  photos jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, period)
);

create index if not exists fm_reports_site_idx on public.fm_reports(site_id);

create trigger fm_reports_updated before update on public.fm_reports
  for each row execute function public.set_updated_at();

alter table public.fm_reports enable row level security;

drop policy if exists fm_reports_read on public.fm_reports;
create policy fm_reports_read on public.fm_reports for select to authenticated
  using (
    public.current_role() in ('admin', 'supervisor')
    or site_id = any(public.current_site_ids())
  );

drop policy if exists fm_reports_write on public.fm_reports;
create policy fm_reports_write on public.fm_reports for all to authenticated
  using (
    public.current_role() = 'admin'
    or (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()))
  )
  with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'facility_manager' and site_id = any(public.current_site_ids()))
  );
