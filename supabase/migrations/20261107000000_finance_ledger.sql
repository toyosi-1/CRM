-- GlassHouse Finance: double-entry accounting module.
-- Core principle: every business document posts journal lines against the
-- chart of accounts; account balances derive from posted lines.

create table if not exists public.fin_accounts (
  id text primary key,
  code text not null unique,
  name text not null,
  type text not null,            -- Cash, Bank, Accounts Receivable, Other Current Asset, Fixed Asset,
                                 -- Accounts Payable, Other Current Liability, Long Term Liability,
                                 -- Equity, Income, Other Income, Cost of Goods Sold, Expense, Other Expense
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.fin_journal_entries (
  id text primary key,
  no text not null unique,        -- MJ-0001, INV-…, RCT-…, BILL-…, PAY-…, EXP-…, BK-…
  source text not null,           -- 'journal' | 'invoice' | 'receipt' | 'bill' | 'payment' | 'expense' | 'bank' | 'fx'
  source_id text,                 -- id of the business document row
  date date not null,
  ref text,
  notes text,
  status text not null default 'published',  -- draft | published | void
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists fin_journal_entries_source_idx on public.fin_journal_entries(source, source_id);

create table if not exists public.fin_journal_lines (
  id text primary key default ('jl_' || gen_random_uuid()::text),
  entry_id text not null references public.fin_journal_entries(id) on delete cascade,
  account_id text not null references public.fin_accounts(id),
  debit numeric not null default 0,
  credit numeric not null default 0,
  memo text,
  created_at timestamptz not null default now()
);
create index if not exists fin_journal_lines_entry_idx on public.fin_journal_lines(entry_id);
create index if not exists fin_journal_lines_account_idx on public.fin_journal_lines(account_id);

create table if not exists public.fin_contacts (
  id text primary key default ('ct_' || gen_random_uuid()::text),
  name text not null,
  type text not null default 'customer',   -- customer | vendor | both
  email text, phone text, address text,
  created_at timestamptz not null default now()
);

create table if not exists public.fin_items (
  id text primary key default ('it_' || gen_random_uuid()::text),
  name text not null,
  description text,
  price numeric not null default 0,
  account_id text references public.fin_accounts(id),
  created_at timestamptz not null default now()
);

create table if not exists public.fin_documents (
  id text primary key default ('doc_' || gen_random_uuid()::text),
  kind text not null,              -- invoice | receipt | bill | payment | expense | bank | project | timesheet | journal | fx
  no text not null,
  date date not null,
  status text not null default 'draft',    -- draft | issued | part_paid | paid | void | published | reconciled
  contact_id text references public.fin_contacts(id),
  site_id text references public.sites(id),
  project_id text,
  total numeric not null default 0,
  paid numeric not null default 0,
  due_date date,
  payload jsonb not null default '{}'::jsonb,   -- lines, meta: vat/wht, terms, bank account, etc.
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists fin_documents_kind_idx on public.fin_documents(kind, status);
create index if not exists fin_documents_contact_idx on public.fin_documents(contact_id);

create table if not exists public.fin_budgets (
  id text primary key default ('bud_' || gen_random_uuid()::text),
  name text not null,
  period text not null,            -- e.g. '2027' or '2027-Q1'
  lines jsonb not null default '[]'::jsonb,   -- [{account_id, amount}]
  created_at timestamptz not null default now()
);

create table if not exists public.fin_activity (
  id text primary key default ('fa_' || gen_random_uuid()::text),
  actor text not null,
  action text not null,
  ref text,
  at timestamptz not null default now()
);

-- RLS: the ledger is finance + admin territory; supervisor reads.
alter table public.fin_accounts enable row level security;
alter table public.fin_journal_entries enable row level security;
alter table public.fin_journal_lines enable row level security;
alter table public.fin_contacts enable row level security;
alter table public.fin_items enable row level security;
alter table public.fin_documents enable row level security;
alter table public.fin_budgets enable row level security;
alter table public.fin_activity enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fin_accounts','fin_journal_entries','fin_journal_lines','fin_contacts','fin_items','fin_documents','fin_budgets','fin_activity'] loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.current_role() in (''finance'',''admin'',''supervisor''))', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.current_role() in (''finance'',''admin'')) with check (public.current_role() in (''finance'',''admin''))', t, t);
  end loop;
end $$;

-- Seed the chart of accounts from the GlassHouse Finance template.
insert into public.fin_accounts (id, code, name, type, locked) values
  ('acc_1000','1000','Petty cash','Cash',true),
  ('acc_1010','1010','Undeposited funds','Cash',true),
  ('acc_1100','1100','Operating bank account','Bank',false),
  ('acc_1200','1200','Accounts receivable','Accounts Receivable',true),
  ('acc_1300','1300','Prepaid expenses','Other Current Asset',false),
  ('acc_1310','1310','Employee advance','Other Current Asset',true),
  ('acc_1320','1320','WHT receivable (advance tax)','Other Current Asset',true),
  ('acc_1330','1330','VAT receivable (input)','Other Current Asset',true),
  ('acc_1500','1500','Furniture and equipment','Fixed Asset',false),
  ('acc_1510','1510','Accumulated depreciation','Fixed Asset',false),
  ('acc_2000','2000','Accounts payable','Accounts Payable',true),
  ('acc_2100','2100','VAT payable (output)','Other Current Liability',true),
  ('acc_2110','2110','WHT payable','Other Current Liability',true),
  ('acc_2120','2120','Employee reimbursements','Other Current Liability',true),
  ('acc_2130','2130','Unearned revenue','Other Current Liability',true),
  ('acc_2140','2140','Opening balance adjustments','Other Current Liability',true),
  ('acc_2500','2500','Long-term loan','Long Term Liability',false),
  ('acc_3000','3000','Owner''s equity','Equity',true),
  ('acc_3100','3100','Retained earnings','Equity',true),
  ('acc_4000','4000','Facility management fees','Income',false),
  ('acc_4010','4010','Maintenance and repairs income','Income',false),
  ('acc_4020','4020','Consulting income','Income',false),
  ('acc_4910','4910','Interest income','Other Income',true),
  ('acc_5000','5000','Cost of goods sold','Cost of Goods Sold',true),
  ('acc_5010','5010','Subcontractor costs','Cost of Goods Sold',false),
  ('acc_6000','6000','Salaries and staff welfare','Expense',false),
  ('acc_6010','6010','Rent','Expense',false),
  ('acc_6020','6020','Diesel and power','Expense',false),
  ('acc_6030','6030','Repairs and maintenance','Expense',false),
  ('acc_6040','6040','Office supplies','Expense',false),
  ('acc_6050','6050','Travel and transport','Expense',false),
  ('acc_6060','6060','Bank fees and charges','Expense',false),
  ('acc_6070','6070','Depreciation','Expense',false),
  ('acc_6080','6080','Professional fees','Expense',false),
  ('acc_6900','6900','Exchange gain or loss','Other Expense',true)
on conflict (id) do nothing;
