-- SLA breach actions: procurement can issue breach notices, flag SLAs for
-- renewal review, and suspend vendors from new jobs.

alter table public.facility_vendor_slas
  add column if not exists suspended boolean not null default false,
  add column if not exists renewal_review boolean not null default false,
  add column if not exists breach_notices jsonb not null default '[]'::jsonb;

-- Procurement (and admin) may update SLA rows for breach action flags/notices.
drop policy if exists facility_vendor_slas_procurement_update on public.facility_vendor_slas;
create policy facility_vendor_slas_procurement_update on public.facility_vendor_slas for update to authenticated
  using (public.current_role() in ('procurement', 'admin'))
  with check (public.current_role() in ('procurement', 'admin'));
