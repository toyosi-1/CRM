-- Facility managers manage petty cash settings for their own sites.
create or replace function public.set_site_petty_cash(p_site_id text, p_enabled boolean, p_float_limit numeric)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.current_role() <> 'facility_manager' or not (p_site_id = any(public.current_site_ids())) then
    raise exception 'Only the facility manager for this site can update petty cash settings';
  end if;
  update public.sites
    set petty_cash_enabled = p_enabled,
        float_limit = greatest(p_float_limit, 0),
        updated_at = now()
  where id = p_site_id;
end;
$$;

grant execute on function public.set_site_petty_cash(text, boolean, numeric) to authenticated;
