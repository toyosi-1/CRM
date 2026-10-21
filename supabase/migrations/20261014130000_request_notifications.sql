create or replace function public.notify_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.user_role;
  notification_title text;
  notification_body text;
begin
  if tg_op = 'INSERT' then
    target_role := 'procurement';
    notification_title := 'New maintenance request';
    notification_body := new.request_number || ' was submitted for ' || new.site_name;
  elsif new.status is distinct from old.status then
    target_role := case new.status
      when 'REQUEST_CREATED' then 'procurement'::public.user_role
      when 'PROCUREMENT_REVIEW' then 'procurement'::public.user_role
      when 'PO_GENERATED' then 'supervisor'::public.user_role
      when 'SUPERVISOR_APPROVAL' then 'supervisor'::public.user_role
      when 'PAYMENT_PENDING' then 'finance'::public.user_role
      when 'ADMIN_APPROVED' then 'finance'::public.user_role
      else null
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
    and (recipient.id = new.submitted_by or recipient.role = target_role or recipient.role = 'admin')
  on conflict do nothing;

  return new;
end;
$$;

create trigger requests_notify_after_write
after insert or update of status on public.requests
for each row execute function public.notify_request_event();
