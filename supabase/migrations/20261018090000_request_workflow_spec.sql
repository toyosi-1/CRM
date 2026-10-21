-- Operational request workflow fields

alter table public.requests add column if not exists category text not null default '';
alter table public.requests add column if not exists location text not null default '';
alter table public.requests add column if not exists sla_available boolean not null default false;
alter table public.requests add column if not exists one_time_vendor jsonb not null default '{}'::jsonb;
alter table public.requests add column if not exists procurement_received_at timestamptz;
alter table public.requests add column if not exists procurement_handled_at timestamptz;
alter table public.requests add column if not exists supervisor_received_at timestamptz;
alter table public.requests add column if not exists supervisor_approved_at timestamptz;
alter table public.requests add column if not exists paid_at timestamptz;

alter table public.assets add column if not exists purchase_date date;
alter table public.assets add column if not exists shelf_life_months integer check (shelf_life_months is null or shelf_life_months >= 0);
alter table public.assets add column if not exists category text not null default '';

alter table public.vendors add column if not exists rc_number text;
alter table public.vendors add column if not exists exemption_notes text;
alter table public.vendors add column if not exists approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected'));
alter table public.vendors add column if not exists requested_by text references public.profiles(id) on delete set null;

drop policy if exists vendors_fm_submit on public.vendors;
create policy vendors_fm_submit on public.vendors for insert to authenticated
  with check (public.current_role() = 'facility_manager' and approval_status = 'pending' and requested_by = public.current_profile_id());

alter table public.incidents add column if not exists resolution_notes text not null default '';

alter table public.job_completions alter column request_id drop not null;
alter table public.job_completions add column if not exists ppm_schedule_id uuid references public.ppm_schedules(id) on delete set null;
create index if not exists job_completions_ppm_idx on public.job_completions(ppm_schedule_id);

-- Operational role permissions aligned with active workflow screens
drop policy if exists sites_fm_update on public.sites;
create policy sites_fm_update on public.sites for update to authenticated
  using (public.current_role() = 'facility_manager' and id = public.current_site_id())
  with check (public.current_role() = 'facility_manager' and id = public.current_site_id());

create or replace function public.guard_fm_site_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.current_role() = 'facility_manager' and (
    new.monthly_budget is distinct from old.monthly_budget or
    new.current_month_spend is distinct from old.current_month_spend or
    new.float_limit is distinct from old.float_limit or
    new.petty_cash_enabled is distinct from old.petty_cash_enabled or
    new.sla_expiry_date is distinct from old.sla_expiry_date
  ) then
    raise exception 'Facility managers cannot change site financial or SLA controls';
  end if;
  return new;
end;
$$;

drop trigger if exists sites_fm_guard on public.sites;
create trigger sites_fm_guard before update on public.sites
  for each row execute function public.guard_fm_site_update();

drop policy if exists checklists_technician_write on public.checklists;
create policy checklists_technician_write on public.checklists for all to authenticated
  using (public.current_role() = 'technician' and site_id = public.current_site_id())
  with check (public.current_role() = 'technician' and site_id = public.current_site_id());

drop policy if exists ppm_manage on public.ppm_schedules;
create policy ppm_manage on public.ppm_schedules for all to authenticated
  using (public.current_role() in ('supervisor', 'admin') or (public.current_role() = 'facility_manager' and site_id = public.current_site_id()))
  with check (public.current_role() in ('supervisor', 'admin') or (public.current_role() = 'facility_manager' and site_id = public.current_site_id()));

drop policy if exists vendors_fm_sla_update on public.vendors;
create policy vendors_fm_sla_update on public.vendors for update to authenticated
  using (public.current_role() = 'facility_manager')
  with check (public.current_role() = 'facility_manager' and approval_status = 'pending' and requested_by = public.current_profile_id());

create or replace function public.guard_fm_vendor_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.current_role() <> 'facility_manager' then
    return new;
  end if;
  if new.name is distinct from old.name or new.type is distinct from old.type
    or new.bank_name is distinct from old.bank_name or new.account_number is distinct from old.account_number
    or new.account_name is distinct from old.account_name or new.total_jobs_completed is distinct from old.total_jobs_completed
    or new.total_amount_paid is distinct from old.total_amount_paid or new.avg_completion_days is distinct from old.avg_completion_days
    or new.last_job_date is distinct from old.last_job_date or new.risk_score is distinct from old.risk_score
    or new.tier is distinct from old.tier or new.contact_person is distinct from old.contact_person
    or new.phone is distinct from old.phone or new.tin is distinct from old.tin or new.verified is distinct from old.verified
    or new.guarantor_profile_id is distinct from old.guarantor_profile_id or new.rc_number is distinct from old.rc_number
    or new.exemption_notes is distinct from old.exemption_notes then
    raise exception 'Facility managers may only submit vendor SLA details';
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_fm_guard on public.vendors;
create trigger vendors_fm_guard before update on public.vendors
  for each row execute function public.guard_fm_vendor_update();
