-- Allow supervisors to act as procurement fallback when no procurement users exist.
-- Also notify supervisors on new requests so they can step in.
create or replace function public.notify_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_roles public.user_role[];
  notification_title text;
  notification_body text;
  has_procurement boolean;
begin
  if tg_op = 'INSERT' then
    select exists(select 1 from public.profiles where active = true and role = 'procurement') into has_procurement;
    target_roles := case when has_procurement then array['procurement'::public.user_role] else array['procurement'::public.user_role, 'supervisor'::public.user_role] end;
    notification_title := 'New maintenance request';
    notification_body := new.request_number || ' was submitted for ' || new.site_name;
  elsif new.status is distinct from old.status then
    target_roles := case new.status
      when 'REQUEST_CREATED' then array['procurement'::public.user_role]
      when 'PROCUREMENT_REVIEW' then array['procurement'::public.user_role]
      when 'PO_GENERATED' then array['supervisor'::public.user_role]
      when 'SUPERVISOR_APPROVAL' then array['supervisor'::public.user_role]
      when 'PAYMENT_PENDING' then array['finance'::public.user_role]
      when 'ADMIN_APPROVED' then array['finance'::public.user_role]
      else array[]::public.user_role[]
    end;
    notification_title := 'Request status updated';
    notification_body := new.request_number || ' is now ' || replace(initcap(new.status::text), '_', ' ');
  else
    return new;
  end if;

  insert into public.notifications (profile_id, title, body, link)
  select recipient.id, notification_title, notification_body, '/request/' || new.id
  from public.profiles recipient
  where recipient.active = true
    and (recipient.id = new.submitted_by or recipient.role = any(target_roles) or recipient.role = 'admin')
  on conflict do nothing;

  return new;
end;
$$;

-- Update request policies so supervisors can also act on procurement stages
drop policy if exists requests_procurement_update on public.requests;
create policy requests_procurement_update on public.requests for update to authenticated
  using (public.current_role() in ('procurement', 'supervisor', 'admin'))
  with check (public.current_role() in ('procurement', 'supervisor', 'admin'));
