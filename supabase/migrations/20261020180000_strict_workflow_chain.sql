-- Enforce the request chain at the database level:
-- Procurement handles REQUEST_CREATED and PROCUREMENT_REVIEW; supervisors can only
-- update requests once a PO has been generated (approval stage).
drop policy if exists requests_procurement_update on public.requests;
create policy requests_procurement_update on public.requests for update to authenticated
  using (public.current_role() in ('procurement', 'admin'))
  with check (public.current_role() in ('procurement', 'admin'));

drop policy if exists requests_supervisor_update on public.requests;
create policy requests_supervisor_update on public.requests for update to authenticated
  using (public.current_role() = 'supervisor' and status in ('PO_GENERATED', 'SUPERVISOR_APPROVAL'))
  with check (public.current_role() = 'supervisor');
