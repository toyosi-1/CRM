-- Rent invoicing: next due date + multiple recipient emails per tenant.
alter table public.tenants add column if not exists next_rent_date date;
alter table public.tenants add column if not exists emails text[] not null default '{}';
-- Backfill emails from the primary email field.
update public.tenants set emails = array[email] where email <> '' and emails = '{}';
