alter table public.tenants
  add column if not exists service_charge numeric(14,2) not null default 0
  check (service_charge >= 0);
