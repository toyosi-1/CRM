-- Align petty cash ownership with operations:
-- admin/supervisor control site limits, finance funds sites, and FMs record expenses.
drop policy if exists sites_finance_update on public.sites;
drop policy if exists sites_supervisor_update on public.sites;
create policy sites_supervisor_update on public.sites for update to authenticated
  using (public.current_role() in ('admin', 'supervisor'))
  with check (public.current_role() in ('admin', 'supervisor'));

drop policy if exists petty_fm_create on public.petty_cash_entries;
create policy petty_insert on public.petty_cash_entries for insert to authenticated
  with check (
    (
      public.current_role() = 'facility_manager'
      and type = 'expense'
      and site_id = any(public.current_site_ids())
      and recorded_by = public.current_profile_id()
    )
    or (
      public.current_role() = 'finance'
      and type = 'top_up'
      and recorded_by = public.current_profile_id()
    )
  );

create or replace function public.set_site_petty_cash(p_site_id text, p_enabled boolean, p_float_limit numeric)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.current_role() not in ('admin', 'supervisor') then
    raise exception 'Only administrators and supervisors can update petty cash settings';
  end if;
  update public.sites
    set petty_cash_enabled = p_enabled,
        float_limit = greatest(p_float_limit, 0),
        updated_at = now()
  where id = p_site_id;
end;
$$;

grant execute on function public.set_site_petty_cash(text, boolean, numeric) to authenticated;

update public.petty_cash_entries
set status = 'approved'
where status = 'pending';
