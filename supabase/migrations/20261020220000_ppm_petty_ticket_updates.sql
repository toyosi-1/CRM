-- PPM completion photos, petty cash edit tracking, and ticket close policy.

alter table public.ppm_schedules
  add column if not exists completion_photos jsonb not null default '[]'::jsonb;

alter table public.petty_cash_entries
  add column if not exists edit_count integer not null default 0,
  add column if not exists edit_notes jsonb not null default '[]'::jsonb;

-- FMs may edit expense entries they recorded at their own facilities; admin keeps full access.
drop policy if exists petty_fm_update on public.petty_cash_entries;
create policy petty_fm_update on public.petty_cash_entries for update to authenticated
  using (
    public.current_role() = 'admin'
    or (public.current_role() = 'facility_manager' and type = 'expense' and site_id = any(public.current_site_ids()) and recorded_by = public.current_profile_id())
  )
  with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'facility_manager' and type = 'expense' and site_id = any(public.current_site_ids()) and recorded_by = public.current_profile_id())
  );

-- A user may close a ticket they raised (final status must be 'closed').
drop policy if exists tickets_raiser_close on public.support_tickets;
create policy tickets_raiser_close on public.support_tickets for update to authenticated
  using (raised_by = public.current_profile_id() and status <> 'closed')
  with check (raised_by = public.current_profile_id() and status = 'closed');
