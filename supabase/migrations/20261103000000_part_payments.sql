-- Part payments: a request may be settled in instalments. Its budget
-- commitment shrinks to the unpaid balance; it is marked PAID only when
-- fully covered. Duplicate-instalment payments are allowed (unique removed).

alter table public.facility_budget_payments drop constraint if exists facility_budget_payments_request_id_key;
create index if not exists facility_payment_request_idx on public.facility_budget_payments(request_id);

alter table public.requests add column if not exists amount_paid numeric(14,2) not null default 0;
update public.requests r set amount_paid = coalesce((select sum(gross_amount) from public.facility_budget_payments p where p.request_id = r.id), 0);

drop function if exists public.record_facility_payment(text,uuid,date,text,text);
create or replace function public.record_facility_payment(p_request_id text, p_category_id uuid, p_paid_on date, p_reference text, p_receipt_url text default null, p_amount numeric default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.requests%rowtype; c public.facility_budget_categories%rowtype; actor public.profiles%rowtype;
  gross numeric; tax numeric; net numeric; allocation numeric; payment_id uuid;
  remaining numeric; journal_id text; expense_id text; new_paid numeric;
begin
  if coalesce(public.current_role()::text, '') not in ('finance','admin') then raise exception 'Finance access required'; end if;
  if p_paid_on is null or p_paid_on > current_date or length(trim(coalesce(p_reference,''))) not between 1 and 200 then raise exception 'Payment date and reference required'; end if;
  if p_amount is not null and (p_amount <= 0 or p_amount::text in ('NaN','Infinity','-Infinity')) then raise exception 'A positive payment amount is required'; end if;
  select * into r from public.requests where id=p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status::text not in ('PAYMENT_PENDING','ADMIN_APPROVED') then raise exception 'Request is not approved for payment'; end if;
  if r.tax_type is null then raise exception 'Choose the tax treatment first'; end if;
  if exists(select 1 from public.fin_documents where kind='lock' and status<>'void' and date>=p_paid_on) then raise exception 'The accounting period is locked'; end if;
  select * into c from public.facility_budget_categories where id=p_category_id for update;
  if not found or c.site_id <> r.site_id then raise exception 'Choose a category for this facility'; end if;
  if r.budget_category_id is not null and r.budget_category_id <> p_category_id then raise exception 'Payment must use the request budget category'; end if;
  if r.invoice_amount is null or r.invoice_amount <= 0 then raise exception 'A positive invoice amount is required'; end if;
  remaining := round(r.invoice_amount - r.amount_paid, 2);
  if remaining <= 0 then raise exception 'Request is already fully paid'; end if;
  gross := coalesce(p_amount, remaining);
  if gross > remaining + 0.005 then raise exception 'Payment exceeds the outstanding balance (%)', remaining; end if;
  gross := round(gross, 2);
  tax := case r.tax_type when '5pct_wht' then round(gross * 0.05,2) when '10pct_wht' then round(gross * 0.10,2) else 0 end;
  net := gross - tax;
  if net <= 0 then raise exception 'Payment amount too small to net a positive disbursement'; end if;
  select amount into allocation from public.facility_budget_allocations where category_id=c.id and year=extract(year from p_paid_on) and month=extract(month from p_paid_on);
  if allocation is null then raise exception 'Set the monthly category allocation before recording payment'; end if;
  select * into actor from public.profiles where id=public.current_profile_id();
  insert into public.facility_budget_payments(request_id,category_id,site_id,paid_on,gross_amount,tax_amount,net_amount,reference,receipt_url,recorded_by)
  values(r.id,c.id,r.site_id,p_paid_on,gross,tax,net,trim(p_reference),nullif(trim(p_receipt_url),''),actor.id) returning id into payment_id;
  new_paid := round(r.amount_paid + gross, 2);
  update public.requests set status = case when new_paid >= r.invoice_amount - 0.005 then 'PAID' else r.status end,
    budget_category_id=c.id, amount_paid=new_paid,
    gross_amount=r.invoice_amount, tax_amount=round(r.invoice_amount * case r.tax_type when '5pct_wht' then 0.05 when '10pct_wht' then 0.10 else 0 end, 2),
    net_payment=round(r.invoice_amount * (1 - case r.tax_type when '5pct_wht' then 0.05 when '10pct_wht' then 0.10 else 0 end), 2),
    payment_receipt_url=coalesce(nullif(trim(p_receipt_url),''), payment_receipt_url),
    paid_at=case when new_paid >= r.invoice_amount - 0.005 then p_paid_on::timestamptz else r.paid_at end,
    audit_trail=audit_trail || jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'requestId',r.id,'userId',actor.id,'userName',actor.name,'userRole',actor.role,'department',actor.department,'action','Payment recorded: ' || trim(p_reference) || '. ' || gross || ' debited; ' || case when new_paid >= r.invoice_amount - 0.005 then 'settled in full.' else 'part payment — ' || (r.invoice_amount - new_paid) || ' still outstanding.' end || ' ' || case when nullif(trim(p_receipt_url),'') is null then 'Receipt outstanding.' else 'Receipt attached.' end,'timestamp',now(),'tatHours',0))
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

revoke all on function public.record_facility_payment(text,uuid,date,text,text,numeric) from public;
grant execute on function public.record_facility_payment(text,uuid,date,text,text,numeric) to authenticated;
