alter table public.assets
  add column if not exists floor text,
  add column if not exists location text;

create index if not exists assets_site_floor_idx on public.assets (site_id, floor);
