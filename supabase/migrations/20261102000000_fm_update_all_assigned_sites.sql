-- An FM may cover multiple sites; the facility-info form edits the ACTIVE site,
-- so the update policy must allow any assigned site, not just the primary one.
drop policy if exists sites_fm_update on public.sites;
create policy sites_fm_update on public.sites for update to authenticated
  using (public.current_role() = 'facility_manager' and id = any(public.current_site_ids()))
  with check (public.current_role() = 'facility_manager' and id = any(public.current_site_ids()));
