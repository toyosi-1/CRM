create table if not exists public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete restrict,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists request_comments_request_idx on public.request_comments(request_id, created_at);

alter table public.request_comments enable row level security;

drop policy if exists request_comments_read on public.request_comments;
create policy request_comments_read on public.request_comments for select to authenticated
  using (exists (select 1 from public.requests r where r.id = request_id));

drop policy if exists request_comments_create on public.request_comments;
create policy request_comments_create on public.request_comments for insert to authenticated
  with check (
    author_id = public.current_profile_id()
    and exists (select 1 from public.requests r where r.id = request_id)
  );

grant select, insert on public.request_comments to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'request_comments'
  ) then
    alter publication supabase_realtime add table public.request_comments;
  end if;
end $$;
