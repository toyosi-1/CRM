-- Split ICT admin from executive admin.
-- ict_admin: staff onboarding, sites/settings, support tickets, checklist templates.
-- Excluded: requests, vendors, assets, incidents, checklists, SLAs, PPM,
-- job completions, treasury/petty/recon (already finance/admin only).

-- enum value added in 20261104000000_ict_admin_enum.sql (must commit first)
update public.profiles set role = 'ict_admin' where email = 'itoffice@propelpfm.com';

-- Staff management: ICT admin can create/edit non-executive staff only.
-- Cannot touch admin/ict_admin rows and cannot assign executive roles.
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated
  using (
    public.current_role() in ('admin','ict_admin')
    and (public.current_role() = 'admin' or role not in ('admin','ict_admin'))
  )
  with check (
    public.current_role() in ('admin','ict_admin')
    and (public.current_role() = 'admin' or role not in ('admin','ict_admin'))
  );

-- Sites & facility settings
drop policy if exists sites_admin_write on public.sites;
create policy sites_admin_write on public.sites for all to authenticated
  using (public.current_role() in ('admin','ict_admin'))
  with check (public.current_role() in ('admin','ict_admin'));

-- Audit visibility for ICT monitoring
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
  using (public.current_role() in ('admin','ict_admin'));

-- Support tickets are the ICT queue
drop policy if exists tickets_own_read on public.support_tickets;
create policy tickets_own_read on public.support_tickets for select to authenticated
  using (raised_by = public.current_profile_id() or public.current_role() in ('admin','ict_admin'));

drop policy if exists tickets_admin_update on public.support_tickets;
create policy tickets_admin_update on public.support_tickets for update to authenticated
  using (public.current_role() in ('admin','ict_admin'))
  with check (public.current_role() in ('admin','ict_admin'));

-- Checklist templates (builder)
drop policy if exists checklist_templates_manage on public.checklist_templates;
create policy checklist_templates_manage on public.checklist_templates for all to authenticated
  using (public.current_role() in ('supervisor','admin','ict_admin'))
  with check (public.current_role() in ('supervisor','admin','ict_admin'));

-- ── Exclude ICT admin from business/operations data ──

drop policy if exists requests_read on public.requests;
create policy requests_read on public.requests for select to authenticated
  using (
    public.current_role() <> 'ict_admin'
    and (
      public.current_role() <> 'facility_manager'
      or site_id = any(public.current_site_ids())
    )
  );

drop policy if exists vendors_read on public.vendors;
create policy vendors_read on public.vendors for select to authenticated
  using (public.current_role() <> 'ict_admin');

drop policy if exists assets_read on public.assets;
create policy assets_read on public.assets for select to authenticated
  using (
    public.current_role() <> 'ict_admin'
    and (
      public.current_role() <> all(array['facility_manager','technician']::public.user_role[])
      or site_id = any(public.current_site_ids())
    )
  );

drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents for select to authenticated
  using (
    public.current_role() <> 'ict_admin'
    and (
      public.current_role() <> 'facility_manager'
      or site_id = any(public.current_site_ids())
    )
  );

drop policy if exists checklists_read on public.checklists;
create policy checklists_read on public.checklists for select to authenticated
  using (
    public.current_role() <> 'ict_admin'
    and (
      public.current_role() <> all(array['facility_manager','technician']::public.user_role[])
      or site_id = any(public.current_site_ids())
    )
  );

drop policy if exists facility_vendor_slas_read on public.facility_vendor_slas;
create policy facility_vendor_slas_read on public.facility_vendor_slas for select to authenticated
  using (public.current_role() <> 'ict_admin');

drop policy if exists job_completions_read on public.job_completions;
create policy job_completions_read on public.job_completions for select to authenticated
  using (public.current_role() <> 'ict_admin');

drop policy if exists ppm_read on public.ppm_schedules;
create policy ppm_read on public.ppm_schedules for select to authenticated
  using (public.current_role() <> 'ict_admin');
