-- Notify the requester, prior commenters on the thread, and admins when a
-- new internal comment is posted on a request. The author is never notified
-- about their own comment.
create or replace function public.notify_request_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.requests%rowtype;
begin
  select * into req from public.requests where id = new.request_id;
  if not found then
    return new;
  end if;

  insert into public.notifications (profile_id, title, body, link)
  select recipient.id,
         'New comment on ' || req.request_number,
         left(new.body, 140),
         '/request/' || req.id
  from public.profiles recipient
  where recipient.active = true
    and recipient.id <> new.author_id
    and (
      recipient.id = req.submitted_by
      or recipient.role = 'admin'
      or exists (
        select 1 from public.request_comments prior
        where prior.request_id = new.request_id
          and prior.author_id = recipient.id
          and prior.id <> new.id
      )
    )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists request_comments_notify on public.request_comments;
create trigger request_comments_notify
  after insert on public.request_comments
  for each row execute function public.notify_request_comment();
