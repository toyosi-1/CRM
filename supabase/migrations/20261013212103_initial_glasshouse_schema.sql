create extension if not exists pgcrypto;

create type public.user_role as enum ('facility_manager', 'procurement', 'supervisor', 'finance', 'admin', 'technician');
create type public.request_status as enum ('REQUEST_CREATED', 'PROCUREMENT_REVIEW', 'PO_GENERATED', 'SUPERVISOR_APPROVAL', 'PAYMENT_PENDING', 'PAID', 'CLOSED', 'REJECTED', 'ADMIN_APPROVED');
create type public.priority_level as enum ('low', 'medium', 'high', 'critical');

create table public.sites (
  id text primary key,
  name text not null,
  address text not null default '',
  size text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  petty_cash_enabled boolean not null default false,
  float_limit numeric(14,2) not null default 0 check (float_limit >= 0),
  monthly_budget numeric(14,2) not null default 0 check (monthly_budget >= 0),
  current_month_spend numeric(14,2) not null default 0 check (current_month_spend >= 0),
  sla_expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  role public.user_role not null,
  site_id text references public.sites(id) on delete set null,
  avatar text,
  department text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id text primary key,
  name text not null,
  category text not null default '',
  type text not null default 'one_time' check (type in ('recurring', 'one_time')),
  bank_name text not null default '',
  account_number text not null default '',
  account_name text not null default '',
  total_jobs_completed integer not null default 0 check (total_jobs_completed >= 0),
  total_amount_paid numeric(14,2) not null default 0 check (total_amount_paid >= 0),
  avg_completion_days numeric(8,2) not null default 0 check (avg_completion_days >= 0),
  last_job_date date,
  risk_score text not null default 'low' check (risk_score in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id text primary key,
  name text not null,
  site_id text not null references public.sites(id) on delete restrict,
  installation_date date,
  last_repair_date date,
  total_repair_cost numeric(14,2) not null default 0 check (total_repair_cost >= 0),
  maintenance_history jsonb not null default '[]'::jsonb,
  status text not null default 'operational' check (status in ('operational', 'under_repair', 'decommissioned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requests (
  id text primary key,
  request_number text not null unique,
  site_id text not null references public.sites(id) on delete restrict,
  site_name text not null,
  submitted_by text not null references public.profiles(id) on delete restrict,
  submitted_by_name text not null,
  description text not null,
  priority public.priority_level not null,
  status public.request_status not null default 'REQUEST_CREATED',
  vendor_id text references public.vendors(id) on delete set null,
  vendor_name text,
  vendor_type text check (vendor_type in ('recurring', 'one_time')),
  invoice_amount numeric(14,2) check (invoice_amount is null or invoice_amount >= 0),
  invoice_url text,
  fault_photo_url text,
  attachments jsonb not null default '[]'::jsonb,
  storage_saved bigint check (storage_saved is null or storage_saved >= 0),
  asset_id text references public.assets(id) on delete set null,
  asset_name text,
  purchase_order jsonb,
  tax_type text check (tax_type in ('5pct_wht', '10pct_wht', 'exempt')),
  gross_amount numeric(14,2),
  tax_amount numeric(14,2),
  net_payment numeric(14,2),
  payment_receipt_url text,
  rejection_comment text,
  is_emergency_bypass boolean not null default false,
  is_budget_warning boolean not null default false,
  sla_deadline timestamptz not null,
  sla_breached boolean not null default false,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checklists (
  id text primary key,
  title text not null,
  site_id text not null references public.sites(id) on delete cascade,
  type text not null check (type in ('generator_walkaround', 'facility_inspection', 'safety_inspection', 'ppm')),
  items jsonb not null default '[]'::jsonb,
  completed_by text references public.profiles(id) on delete set null,
  completed_at timestamptz,
  submitted_to_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.treasury (
  id text primary key,
  description text not null,
  source text not null,
  amount numeric(14,2) not null check (amount >= 0),
  type text not null check (type in ('inflow', 'outflow')),
  date timestamptz not null,
  recorded_by text not null,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  request_id text references public.requests(id) on delete set null,
  reported_by text not null references public.profiles(id) on delete restrict,
  title text not null,
  description text not null,
  severity public.priority_level not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'closed')),
  attachments jsonb not null default '[]'::jsonb,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ppm_schedules (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  asset_id text references public.assets(id) on delete set null,
  vendor_id text references public.vendors(id) on delete set null,
  title text not null,
  description text not null default '',
  frequency_months integer not null check (frequency_months > 0),
  next_due_date date not null,
  last_completed_date date,
  status text not null default 'scheduled' check (status in ('scheduled', 'due', 'overdue', 'completed', 'deferred')),
  assigned_to text references public.profiles(id) on delete set null,
  deferral_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.petty_cash_entries (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  type text not null check (type in ('top_up', 'expense')),
  description text not null,
  receipt_url text,
  recorded_by text not null references public.profiles(id) on delete restrict,
  approved_by text references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  raised_by text not null references public.profiles(id) on delete restrict,
  page text not null default '',
  subject text not null,
  body text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'blocking')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index requests_site_idx on public.requests(site_id);
create index requests_status_idx on public.requests(status);
create index requests_created_idx on public.requests(created_at desc);
create index checklists_site_idx on public.checklists(site_id);
create index assets_site_idx on public.assets(site_id);
create index incidents_site_status_idx on public.incidents(site_id, status);
create index ppm_due_idx on public.ppm_schedules(next_due_date, status);
create index notifications_profile_idx on public.notifications(profile_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sites_updated before update on public.sites for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger vendors_updated before update on public.vendors for each row execute function public.set_updated_at();
create trigger assets_updated before update on public.assets for each row execute function public.set_updated_at();
create trigger requests_updated before update on public.requests for each row execute function public.set_updated_at();
create trigger checklists_updated before update on public.checklists for each row execute function public.set_updated_at();
create trigger incidents_updated before update on public.incidents for each row execute function public.set_updated_at();
create trigger ppm_updated before update on public.ppm_schedules for each row execute function public.set_updated_at();
create trigger tickets_updated before update on public.support_tickets for each row execute function public.set_updated_at();

create or replace function public.current_profile_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select id from public.profiles where auth_user_id = auth.uid() and active = true limit 1 $$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$ select role from public.profiles where auth_user_id = auth.uid() and active = true limit 1 $$;

create or replace function public.current_site_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select site_id from public.profiles where auth_user_id = auth.uid() and active = true limit 1 $$;

alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.assets enable row level security;
alter table public.requests enable row level security;
alter table public.checklists enable row level security;
alter table public.treasury enable row level security;
alter table public.incidents enable row level security;
alter table public.ppm_schedules enable row level security;
alter table public.petty_cash_entries enable row level security;
alter table public.support_tickets enable row level security;
alter table public.notifications enable row level security;

create policy sites_read on public.sites for select to authenticated using (true);
create policy sites_admin_write on public.sites for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy sites_finance_update on public.sites for update to authenticated using (public.current_role() = 'finance') with check (public.current_role() = 'finance');

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_self_update on public.profiles for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy profiles_admin_write on public.profiles for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy vendors_read on public.vendors for select to authenticated using (true);
create policy vendors_manage on public.vendors for all to authenticated using (public.current_role() in ('procurement', 'admin')) with check (public.current_role() in ('procurement', 'admin'));

create policy assets_read on public.assets for select to authenticated using (true);
create policy assets_manage on public.assets for all to authenticated using (public.current_role() in ('facility_manager', 'technician', 'admin')) with check (public.current_role() in ('facility_manager', 'technician', 'admin'));

create policy requests_read on public.requests for select to authenticated using (public.current_role() <> 'facility_manager' or site_id = public.current_site_id());
create policy requests_create on public.requests for insert to authenticated with check (public.current_role() = 'facility_manager' and submitted_by = public.current_profile_id() and site_id = public.current_site_id());
create policy requests_procurement_update on public.requests for update to authenticated using (public.current_role() = 'procurement') with check (public.current_role() = 'procurement');
create policy requests_supervisor_update on public.requests for update to authenticated using (public.current_role() = 'supervisor') with check (public.current_role() = 'supervisor');
create policy requests_finance_update on public.requests for update to authenticated using (public.current_role() = 'finance') with check (public.current_role() = 'finance');
create policy requests_admin_update on public.requests for update to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy checklists_read on public.checklists for select to authenticated using (public.current_role() <> 'facility_manager' or site_id = public.current_site_id());
create policy checklists_fm_write on public.checklists for all to authenticated using (public.current_role() = 'facility_manager' and site_id = public.current_site_id()) with check (public.current_role() = 'facility_manager' and site_id = public.current_site_id());
create policy checklists_admin_write on public.checklists for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy treasury_read on public.treasury for select to authenticated using (public.current_role() in ('finance', 'admin'));
create policy treasury_write on public.treasury for all to authenticated using (public.current_role() in ('finance', 'admin')) with check (public.current_role() in ('finance', 'admin'));

create policy incidents_read on public.incidents for select to authenticated using (public.current_role() <> 'facility_manager' or site_id = public.current_site_id());
create policy incidents_site_write on public.incidents for all to authenticated using (public.current_role() in ('facility_manager', 'technician', 'admin') and (public.current_role() = 'admin' or site_id = public.current_site_id())) with check (public.current_role() in ('facility_manager', 'technician', 'admin') and (public.current_role() = 'admin' or site_id = public.current_site_id()));

create policy ppm_read on public.ppm_schedules for select to authenticated using (true);
create policy ppm_manage on public.ppm_schedules for all to authenticated using (public.current_role() in ('supervisor', 'admin')) with check (public.current_role() in ('supervisor', 'admin'));
create policy ppm_technician_update on public.ppm_schedules for update to authenticated using (public.current_role() = 'technician' and assigned_to = public.current_profile_id()) with check (public.current_role() = 'technician' and assigned_to = public.current_profile_id());

create policy petty_read on public.petty_cash_entries for select to authenticated using (public.current_role() in ('finance', 'admin') or site_id = public.current_site_id());
create policy petty_fm_create on public.petty_cash_entries for insert to authenticated with check (public.current_role() = 'facility_manager' and site_id = public.current_site_id() and recorded_by = public.current_profile_id());
create policy petty_finance_manage on public.petty_cash_entries for update to authenticated using (public.current_role() in ('finance', 'admin')) with check (public.current_role() in ('finance', 'admin'));

create policy tickets_own_read on public.support_tickets for select to authenticated using (raised_by = public.current_profile_id() or public.current_role() = 'admin');
create policy tickets_create on public.support_tickets for insert to authenticated with check (raised_by = public.current_profile_id());
create policy tickets_admin_update on public.support_tickets for update to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy notifications_own_read on public.notifications for select to authenticated using (profile_id = public.current_profile_id());
create policy notifications_own_update on public.notifications for update to authenticated using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-files', 'request-files', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy request_files_read on storage.objects for select to authenticated using (bucket_id = 'request-files');
create policy request_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'request-files' and public.current_role() is not null);
create policy request_files_update on storage.objects for update to authenticated using (bucket_id = 'request-files' and owner_id = auth.uid()::text) with check (bucket_id = 'request-files' and owner_id = auth.uid()::text);

alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.checklists;
alter publication supabase_realtime add table public.treasury;
alter publication supabase_realtime add table public.notifications;
