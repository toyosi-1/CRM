alter table public.sites add column if not exists site_type text not null default 'residential' check (site_type in ('residential', 'commercial', 'estate', 'mixed_use'));
alter table public.sites add column if not exists floors text not null default '';
alter table public.sites add column if not exists units text not null default '';
alter table public.sites add column if not exists scope text not null default '';
alter table public.sites add column if not exists electricity_billing text not null default 'postpaid' check (electricity_billing in ('postpaid', 'prepaid', 'none'));
alter table public.sites add column if not exists meter_account_no text not null default '';
alter table public.sites add column if not exists emergency_contact text not null default '';
alter table public.sites add column if not exists security_desk text not null default '';
alter table public.sites add column if not exists status text not null default 'healthy' check (status in ('healthy', 'watch', 'overspent', 'inactive'));

alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists trade text not null default '';

alter table public.vendors add column if not exists tier text not null default '3' check (tier in ('1', '2', '3'));
alter table public.vendors add column if not exists contact_person text not null default '';
alter table public.vendors add column if not exists phone text not null default '';
alter table public.vendors add column if not exists tin text not null default '';
alter table public.vendors add column if not exists response_sla_hours integer check (response_sla_hours is null or response_sla_hours > 0);
alter table public.vendors add column if not exists sla_document_url text;
alter table public.vendors add column if not exists verified boolean not null default false;
alter table public.vendors add column if not exists guarantor_profile_id text references public.profiles(id) on delete set null;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  name text not null,
  unit text not null default '',
  email text not null default '',
  phone text not null default '',
  monthly_rent numeric(14,2) not null default 0 check (monthly_rent >= 0),
  lease_expiry date,
  last_payment_date date,
  status text not null default 'paid' check (status in ('paid', 'expiring_soon', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tenants_site_idx on public.tenants(site_id);
create trigger tenants_updated before update on public.tenants for each row execute function public.set_updated_at();

create table public.job_completions (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests(id) on delete cascade,
  submitted_by text not null references public.profiles(id) on delete restrict,
  narrative text not null,
  before_photo_url text,
  after_photo_url text,
  created_at timestamptz not null default now()
);

create index job_completions_request_idx on public.job_completions(request_id);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  title text not null,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'monthly')),
  zones jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checklist_templates_site_idx on public.checklist_templates(site_id);
create trigger checklist_templates_updated before update on public.checklist_templates for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;
alter table public.job_completions enable row level security;
alter table public.checklist_templates enable row level security;

create policy tenants_read on public.tenants for select to authenticated using (public.current_role() in ('admin', 'supervisor', 'finance') or site_id = public.current_site_id());
create policy tenants_admin_write on public.tenants for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy job_completions_read on public.job_completions for select to authenticated using (true);
create policy job_completions_create on public.job_completions for insert to authenticated with check (public.current_role() = 'technician' and submitted_by = public.current_profile_id());

create policy checklist_templates_read on public.checklist_templates for select to authenticated using (true);
create policy checklist_templates_manage on public.checklist_templates for all to authenticated using (public.current_role() in ('supervisor', 'admin')) with check (public.current_role() in ('supervisor', 'admin'));

alter publication supabase_realtime add table public.tenants;
alter publication supabase_realtime add table public.job_completions;
alter publication supabase_realtime add table public.checklist_templates;
