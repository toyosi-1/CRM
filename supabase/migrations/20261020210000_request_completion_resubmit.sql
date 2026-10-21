-- Job completion form upload on requests; FM resubmit after rejection; FM completion upload.
alter table public.requests add column if not exists job_completion_url text;

-- FM can resubmit their own rejected request back to REQUEST_CREATED
drop policy if exists requests_fm_resubmit on public.requests;
create policy requests_fm_resubmit on public.requests for update to authenticated
  using (
    public.current_role() = 'facility_manager'
    and submitted_by = public.current_profile_id()
    and site_id = any(public.current_site_ids())
    and status = 'REJECTED'
  )
  with check (
    public.current_role() = 'facility_manager'
    and submitted_by = public.current_profile_id()
    and status = 'REQUEST_CREATED'
  );

-- FM can attach a job completion form to their own paid/closed request
drop policy if exists requests_fm_completion on public.requests;
create policy requests_fm_completion on public.requests for update to authenticated
  using (
    public.current_role() = 'facility_manager'
    and submitted_by = public.current_profile_id()
    and site_id = any(public.current_site_ids())
    and status in ('PAID', 'CLOSED')
  )
  with check (
    public.current_role() = 'facility_manager'
    and submitted_by = public.current_profile_id()
    and status in ('PAID', 'CLOSED')
  );
