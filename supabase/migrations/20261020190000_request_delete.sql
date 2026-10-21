-- Allow deleting a request that was created in error:
-- the submitting FM (for their own sites) or an admin, only while it is still REQUEST_CREATED.
drop policy if exists requests_delete on public.requests;
create policy requests_delete on public.requests for delete to authenticated
  using (
    public.current_role() = 'admin'
    or (
      public.current_role() = 'facility_manager'
      and submitted_by = public.current_profile_id()
      and status = 'REQUEST_CREATED'
      and site_id = any(public.current_site_ids())
    )
  );
