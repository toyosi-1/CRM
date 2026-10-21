-- Shared vendor pool contact details, weekday checklist schedules, and site-scoped asset/checklist access

alter table public.vendors add column if not exists email text not null default '';
alter table public.vendors add column if not exists alias text not null default '';

alter table public.checklist_templates add column if not exists days_of_week smallint[] not null default '{}';
alter table public.checklist_templates drop constraint if exists checklist_templates_days_of_week_check;
alter table public.checklist_templates add constraint checklist_templates_days_of_week_check
  check (days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]);

-- Facility managers and technicians only see assets, checklist templates and checklists for their assigned sites
drop policy if exists assets_read on public.assets;
create policy assets_read on public.assets for select to authenticated
  using (public.current_role() not in ('facility_manager', 'technician') or site_id = any(public.current_site_ids()));

drop policy if exists assets_manage on public.assets;
create policy assets_manage on public.assets for all to authenticated
  using (public.current_role() = 'admin' or (public.current_role() in ('facility_manager', 'technician') and site_id = any(public.current_site_ids())))
  with check (public.current_role() = 'admin' or (public.current_role() in ('facility_manager', 'technician') and site_id = any(public.current_site_ids())));

drop policy if exists checklist_templates_read on public.checklist_templates;
create policy checklist_templates_read on public.checklist_templates for select to authenticated
  using (public.current_role() not in ('facility_manager', 'technician') or site_id = any(public.current_site_ids()));

drop policy if exists checklists_read on public.checklists;
create policy checklists_read on public.checklists for select to authenticated
  using (public.current_role() not in ('facility_manager', 'technician') or site_id = any(public.current_site_ids()));

-- FM SLA submissions must not alter vendor identity or contact details
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
    or new.exemption_notes is distinct from old.exemption_notes
    or new.email is distinct from old.email or new.alias is distinct from old.alias then
    raise exception 'Facility managers may only submit vendor SLA details';
  end if;
  return new;
end;
$$;
