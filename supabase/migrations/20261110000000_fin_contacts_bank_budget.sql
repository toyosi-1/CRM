-- Vendor/customer bank details (for payments) + budget period type on budgets.

alter table public.fin_contacts
  add column if not exists bank_name text,
  add column if not exists bank_account_no text,
  add column if not exists bank_code text;

alter table public.fin_budgets add column if not exists budget_period text not null default 'monthly';
