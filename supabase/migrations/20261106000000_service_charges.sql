-- Service charge billing: how it's charged, when the next invoice goes out,
-- and a ledger of issued service-charge invoices.
alter table public.tenants
  add column if not exists service_charge_billing text not null default 'separate',
  add column if not exists service_charge_invoice_date date;

create table if not exists public.service_charge_invoices (
  id text primary key default ('scv_' || gen_random_uuid()::text),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id text not null references public.sites(id),
  amount numeric not null,
  period_label text not null,
  due_date date,
  status text not null default 'issued',
  issued_by text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.service_charge_invoices enable row level security;

drop policy if exists service_charge_read on public.service_charge_invoices;
create policy service_charge_read on public.service_charge_invoices for select to authenticated
  using (true);

drop policy if exists service_charge_admin_write on public.service_charge_invoices;
create policy service_charge_admin_write on public.service_charge_invoices for all to authenticated
  using (public.current_role() in ('admin', 'supervisor', 'finance'))
  with check (public.current_role() in ('admin', 'supervisor', 'finance'));
