-- Facility categories link to chart-of-accounts for budget-vs-actual reporting
alter table public.facility_budget_categories add column if not exists account_id text references public.fin_accounts(id);

-- Vendor pool: certification / supporting documents
alter table public.vendors add column if not exists documents jsonb not null default '[]'::jsonb;
