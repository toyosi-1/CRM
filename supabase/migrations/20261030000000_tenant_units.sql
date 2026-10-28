-- Multi-unit tenancies: a tenant can occupy several units, each with its own rent.
alter table public.tenants add column if not exists units jsonb not null default '[]'::jsonb;
-- Backfill: single-unit tenants get their existing unit label as the first entry.
update public.tenants set units = jsonb_build_array(jsonb_build_object('label', unit, 'rent', monthly_rent))
  where units = '[]'::jsonb and unit <> '';
