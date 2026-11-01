create table if not exists public.facility_budget_categories (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id),
  name text not null check (length(trim(name)) between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, site_id)
);
create unique index if not exists facility_category_name_idx on public.facility_budget_categories(site_id, lower(trim(name)));

create table if not exists public.facility_budget_allocations (
  category_id uuid not null references public.facility_budget_categories(id),
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  amount numeric(14,2) not null check (amount >= 0),
  updated_by text not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (category_id, year, month)
);
alter table public.requests add column if not exists budget_category_id uuid references public.facility_budget_categories(id);

create table if not exists public.facility_budget_payments (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique references public.requests(id),
  category_id uuid not null,
  site_id text not null,
  paid_on date not null,
  gross_amount numeric(14,2) not null check (gross_amount > 0),
  tax_amount numeric(14,2) not null check (tax_amount >= 0),
  net_amount numeric(14,2) not null check (net_amount > 0),
  reference text not null check (length(trim(reference)) between 1 and 200),
  receipt_url text,
  recorded_by text not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (gross_amount = tax_amount + net_amount),
  foreign key (category_id, site_id) references public.facility_budget_categories(id, site_id)
);
create index if not exists facility_payment_period_idx on public.facility_budget_payments(category_id, paid_on);

alter table public.facility_budget_categories enable row level security;
alter table public.facility_budget_allocations enable row level security;
alter table public.facility_budget_payments enable row level security;

drop policy if exists facility_categories_read on public.facility_budget_categories;
create policy facility_categories_read on public.facility_budget_categories for select to authenticated
using (public.current_role() in ('finance','admin') or (public.current_role() in ('facility_manager','supervisor') and site_id = any(public.current_site_ids())));
drop policy if exists facility_categories_write on public.facility_budget_categories;
create policy facility_categories_write on public.facility_budget_categories for all to authenticated
using (public.current_role() in ('finance','admin')) with check (public.current_role() in ('finance','admin'));
drop policy if exists facility_allocations_read on public.facility_budget_allocations;
create policy facility_allocations_read on public.facility_budget_allocations for select to authenticated
using (exists (select 1 from public.facility_budget_categories c where c.id = category_id));
drop policy if exists facility_payments_read on public.facility_budget_payments;
create policy facility_payments_read on public.facility_budget_payments for select to authenticated
using (public.current_role() in ('finance','admin') or (public.current_role() in ('facility_manager','supervisor') and site_id = any(public.current_site_ids())));

create or replace function public.save_facility_budget(p_category_id uuid, p_year integer, p_months numeric[])
returns void language plpgsql security definer set search_path = '' as $$
declare m integer; spent numeric;
begin
  if coalesce(public.current_role()::text, '') not in ('finance','admin') then raise exception 'Finance access required'; end if;
  if p_year is null or p_year not between 2020 and 2100 or array_length(p_months,1) is distinct from 12 or array_lower(p_months,1) is distinct from 1 then raise exception 'Provide a year and 12 monthly allocations'; end if;
  perform 1 from public.facility_budget_categories where id = p_category_id for update;
  if not found then raise exception 'Category not found'; end if;
  for m in 1..12 loop
    if p_months[m] is null or p_months[m] < 0 or p_months[m]::text in ('NaN','Infinity','-Infinity') or p_months[m] <> round(p_months[m],2) then raise exception 'Invalid monthly allocation'; end if;
    select coalesce(sum(gross_amount),0) into spent from public.facility_budget_payments
    where category_id = p_category_id and extract(year from paid_on) = p_year and extract(month from paid_on) = m;
    if p_months[m] < spent then raise exception 'Allocation for month % cannot be below recorded spending (%)', m, spent; end if;
    insert into public.facility_budget_allocations(category_id,year,month,amount,updated_by)
    values(p_category_id,p_year,m,p_months[m],public.current_profile_id())
    on conflict(category_id,year,month) do update set amount=excluded.amount, updated_by=excluded.updated_by, updated_at=now();
  end loop;
  insert into public.fin_activity(actor,action,ref)
  select name, 'Updated facility category budget for ' || p_year, p_category_id::text from public.profiles where id=public.current_profile_id();
end $$;

create or replace function public.record_facility_payment(p_request_id text, p_category_id uuid, p_paid_on date, p_reference text, p_receipt_url text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.requests%rowtype; c public.facility_budget_categories%rowtype; actor public.profiles%rowtype;
  gross numeric; tax numeric; net numeric; allocation numeric; payment_id uuid;
  journal_id text; expense_id text;
begin
  if coalesce(public.current_role()::text, '') not in ('finance','admin') then raise exception 'Finance access required'; end if;
  if p_paid_on is null or p_paid_on > current_date or length(trim(coalesce(p_reference,''))) not between 1 and 200 then raise exception 'Payment date and reference required'; end if;
  select * into r from public.requests where id=p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if exists(select 1 from public.facility_budget_payments where request_id=p_request_id) then raise exception 'Payment already recorded'; end if;
  if r.status::text not in ('PAYMENT_PENDING','ADMIN_APPROVED') then raise exception 'Request is not approved for payment'; end if;
  if r.tax_type is null then raise exception 'Choose the tax treatment first'; end if;
  if exists(select 1 from public.fin_documents where kind='lock' and status<>'void' and date>=p_paid_on) then raise exception 'The accounting period is locked'; end if;
  select * into c from public.facility_budget_categories where id=p_category_id for update;
  if not found or c.site_id <> r.site_id then raise exception 'Choose a category for this facility'; end if;
  if r.budget_category_id is not null and r.budget_category_id <> p_category_id then raise exception 'Payment must use the request budget category'; end if;
  gross := r.invoice_amount;
  tax := case r.tax_type when '5pct_wht' then round(gross * 0.05,2) when '10pct_wht' then round(gross * 0.10,2) else 0 end;
  net := gross - tax;
  if gross is null or gross <= 0 or net <= 0 then raise exception 'A positive invoice amount is required'; end if;
  select amount into allocation from public.facility_budget_allocations where category_id=c.id and year=extract(year from p_paid_on) and month=extract(month from p_paid_on);
  if allocation is null then raise exception 'Set the monthly category allocation before recording payment'; end if;
  select * into actor from public.profiles where id=public.current_profile_id();
  insert into public.facility_budget_payments(request_id,category_id,site_id,paid_on,gross_amount,tax_amount,net_amount,reference,receipt_url,recorded_by)
  values(r.id,c.id,r.site_id,p_paid_on,gross,tax,net,trim(p_reference),nullif(trim(p_receipt_url),''),actor.id) returning id into payment_id;
  update public.requests set status='PAID', budget_category_id=c.id, gross_amount=gross, tax_amount=tax, net_payment=net,
    payment_receipt_url=nullif(trim(p_receipt_url),''), paid_at=p_paid_on::timestamptz,
    audit_trail=audit_trail || jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'requestId',r.id,'userId',actor.id,'userName',actor.name,'userRole',actor.role,'department',actor.department,'action','Payment recorded: ' || trim(p_reference) || '. Category budget debited ' || gross || '. ' || case when nullif(trim(p_receipt_url),'') is null then 'Receipt outstanding.' else 'Receipt attached.' end,'timestamp',now(),'tatHours',0))
  where id=r.id;
  journal_id := 'je_' || gen_random_uuid()::text;
  expense_id := case when lower(c.name) similar to '%(diesel|generator|power)%' then 'acc_6020' when lower(c.name) similar to '%(office|supplies)%' then 'acc_6040' when lower(c.name) similar to '%(travel|transport)%' then 'acc_6050' else 'acc_6030' end;
  insert into public.fin_journal_entries(id,no,source,source_id,date,ref,notes,created_by)
  values(journal_id,'FP-' || payment_id::text,'payment',r.id,p_paid_on,trim(p_reference),r.description,actor.name);
  insert into public.fin_journal_lines(entry_id,account_id,debit,credit,memo) values
    (journal_id,expense_id,gross,0,c.name),(journal_id,'acc_1100',0,net,'Payment recorded');
  if tax > 0 then insert into public.fin_journal_lines(entry_id,account_id,debit,credit,memo) values(journal_id,'acc_2110',0,tax,'WHT withheld'); end if;
  insert into public.fin_activity(actor,action,ref) values(actor.name,'Recorded facility payment and category budget debit',r.request_number);
  return payment_id;
end $$;

create or replace function public.attach_facility_payment_receipt(p_payment_id uuid,p_receipt_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.facility_budget_payments%rowtype; actor public.profiles%rowtype;
begin
  if coalesce(public.current_role()::text, '') not in ('finance','admin') then raise exception 'Finance access required'; end if;
  if nullif(trim(p_receipt_url),'') is null then raise exception 'Receipt required'; end if;
  select * into p from public.facility_budget_payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  select * into actor from public.profiles where id=public.current_profile_id();
  update public.facility_budget_payments set receipt_url=p_receipt_url where id=p.id;
  update public.requests set payment_receipt_url=p_receipt_url,
    audit_trail=audit_trail || jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'requestId',p.request_id,'userId',actor.id,'userName',actor.name,'userRole',actor.role,'department',actor.department,'action','Payment receipt attached','timestamp',now(),'tatHours',0)) where id=p.request_id;
end $$;

create or replace function public.guard_facility_budget_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.facility_budget_categories%rowtype;
begin
  if tg_op='DELETE' then
    if exists(select 1 from public.facility_budget_payments where request_id=old.id) then raise exception 'Paid requests cannot be deleted'; end if;
    return old;
  end if;
  if tg_op='UPDATE' and exists(select 1 from public.facility_budget_payments where request_id=old.id) and
    (new.site_id is distinct from old.site_id or new.invoice_amount is distinct from old.invoice_amount or
     new.tax_type is distinct from old.tax_type or new.category is distinct from old.category or
     (old.status::text in ('PAID','CLOSED') and (new.budget_category_id is distinct from old.budget_category_id or new.paid_at is distinct from old.paid_at or new.gross_amount is distinct from old.gross_amount or new.tax_amount is distinct from old.tax_amount or new.net_payment is distinct from old.net_payment or new.status::text not in ('PAID','CLOSED')))) then
    raise exception 'Recorded payment financial details are immutable';
  end if;
  if new.status::text='PAID' and (tg_op='INSERT' or old.status is distinct from new.status) and not exists(select 1 from public.facility_budget_payments where request_id=new.id) then raise exception 'Use the facility payment workflow'; end if;
  if tg_op='INSERT' or new.budget_category_id is distinct from old.budget_category_id or new.site_id is distinct from old.site_id then
    if new.budget_category_id is not null then
      select * into c from public.facility_budget_categories where id=new.budget_category_id;
      if not found or c.site_id<>new.site_id or (tg_op='INSERT' and not c.active) then raise exception 'Invalid facility budget category'; end if;
    elsif tg_op='INSERT' and exists(select 1 from public.facility_budget_categories where site_id=new.site_id) then
      select * into c from public.facility_budget_categories where site_id=new.site_id and active and lower(trim(name))=lower(trim(new.category));
      if not found then raise exception 'Choose a Finance-managed facility category'; end if;
      new.budget_category_id := c.id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists facility_budget_request_guard on public.requests;
create trigger facility_budget_request_guard before insert or update or delete on public.requests for each row execute function public.guard_facility_budget_request();

revoke all on function public.save_facility_budget(uuid,integer,numeric[]) from public;
revoke all on function public.record_facility_payment(text,uuid,date,text,text) from public;
revoke all on function public.attach_facility_payment_receipt(uuid,text) from public;
grant execute on function public.save_facility_budget(uuid,integer,numeric[]) to authenticated;
grant execute on function public.record_facility_payment(text,uuid,date,text,text) to authenticated;
grant execute on function public.attach_facility_payment_receipt(uuid,text) to authenticated;

do $$ declare t text; begin
  foreach t in array array['facility_budget_categories','facility_budget_allocations','facility_budget_payments'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
end $$;
