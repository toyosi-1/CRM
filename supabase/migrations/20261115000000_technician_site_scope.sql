-- Technicians are site-scoped staff (same model as facility managers).
-- Previously requests_read/incidents_read allowed technicians to read every
-- site's records. Now: their assigned sites, plus requests assigned to them.

drop policy if exists requests_read on public.requests;
create policy requests_read on public.requests for select to authenticated
  using (
    public.current_role() <> 'ict_admin'
    and (
      public.current_role() not in ('facility_manager', 'technician')
      or site_id = any(public.current_site_ids())
      or (public.current_role() = 'technician' and assigned_to = public.current_profile_id())
    )
  );

drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents for select to authenticated
  using (
    public.current_role() <> 'ict_admin'
    and (
      public.current_role() not in ('facility_manager', 'technician')
      or site_id = any(public.current_site_ids())
    )
  );
