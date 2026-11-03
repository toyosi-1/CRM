-- Finance integrity: atomic postings, immutable posted records, enforced
-- period locks, facility dimension on journal lines, persisted period close.
-- After this migration the journal tables are written ONLY through RPCs.

-- ── 0. Realtime: the ledger subscribed to these tables but they were never
--    published, so new/updated documents did not propagate to open sessions.
do $$
declare t text;
begin
  foreach t in array array['fin_accounts','fin_journal_entries','fin_journal_lines','fin_documents','fin_contacts','fin_items','fin_budgets','fin_activity','fin_recurring'] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t)
       and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── 1. Facility dimension on journal lines ─────────────────────────────────
alter table public.fin_journal_lines add column if not exists site_id text references public.sites(id);
create index if not exists fin_journal_lines_site_idx on public.fin_journal_lines(site_id);

update public.fin_journal_lines l set site_id = d.site_id
from public.fin_journal_entries e join public.fin_documents d on d.id = e.source_id
where l.entry_id = e.id and l.site_id is null;
update public.fin_journal_lines l set site_id = r.site_id
from public.fin_journal_entries e join public.requests r on r.id = e.source_id
where l.entry_id = e.id and l.site_id is null;

-- ── 2. Shared helpers ──────────────────────────────────────────────────────
create or replace function public.fin_require_role()
returns void language plpgsql stable set search_path = '' as $$
begin
  if coalesce(public.current_role()::text, '') not in ('finance','admin') then
    raise exception 'Finance access required';
  end if;
end $$;

create or replace function public.fin_locked_until()
returns date language sql stable set search_path = '' as $$
  select max(date) from public.fin_documents where kind='lock' and status <> 'void'
$$;

-- ── 3. Document guard: no deletes on posted docs, frozen fields, period lock ─
create or replace function public.guard_fin_document()
returns trigger language plpgsql set search_path = '' as $$
declare lock_until date;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' or old.kind = 'lock' then
      raise exception 'Financial documents cannot be deleted — void them instead';
    end if;
    return old;
  end if;
  select public.fin_locked_until() into lock_until;
  if tg_op = 'INSERT' then
    if new.kind <> 'lock' and lock_until is not null and new.date <= lock_until then
      raise exception 'The accounting period through % is locked', lock_until;
    end if;
    return new;
  end if;
  -- UPDATE
  if old.kind = 'lock' then return new; end if;             -- lock docs: status toggles = unlock
  if old.status = 'void' then raise exception 'Voided documents cannot be edited'; end if;
  if lock_until is not null and old.date <= lock_until then
    raise exception 'Document is in a locked accounting period (through %)', lock_until;
  end if;
  -- A posted document (published journal exists) cannot be re-dated, renumbered,
  -- re-totalled or re-assigned. State fields (status, paid, payload) may change.
  if exists (select 1 from public.fin_journal_entries e where e.source_id = old.id and e.status = 'published')
     and (new.no is distinct from old.no or new.date is distinct from old.date
          or new.total is distinct from old.total or new.site_id is distinct from old.site_id
          or new.contact_id is distinct from old.contact_id) then
    raise exception 'Posted documents are immutable — void and re-issue instead';
  end if;
  return new;
end $$;
drop trigger if exists fin_document_guard on public.fin_documents;
create trigger fin_document_guard before insert or update or delete on public.fin_documents
for each row execute function public.guard_fin_document();

create unique index if not exists fin_documents_kind_no_live
on public.fin_documents(kind, no) where status <> 'void';

-- ── 4. Journal writes via RPC only ─────────────────────────────────────────
revoke insert, update, delete on public.fin_journal_entries from authenticated;
revoke insert, update, delete on public.fin_journal_lines from authenticated;
grant select on public.fin_journal_entries to authenticated;
grant select on public.fin_journal_lines to authenticated;

-- ── 5. Atomic posting RPC: entry + balanced lines in one transaction ───────
create or replace function public.post_journal(
  p_no text, p_source text, p_source_id text, p_date date,
  p_ref text, p_notes text, p_status text, p_lines jsonb, p_site_id text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare e_id text; dr numeric := 0; cr numeric := 0; ln jsonb; lock_until date; actor text;
begin
  perform public.fin_require_role();
  if p_status is null then p_status := 'published'; end if;
  if p_status not in ('draft','published') then raise exception 'Invalid journal status'; end if;
  if p_date is null then raise exception 'Journal date required'; end if;
  select public.fin_locked_until() into lock_until;
  if lock_until is not null and p_date <= lock_until then
    raise exception 'The accounting period through % is locked', lock_until;
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Journal requires at least one line';
  end if;
  for ln in select * from jsonb_array_elements(p_lines) loop
    dr := dr + coalesce((ln->>'dr')::numeric, (ln->>'debit')::numeric, 0);
    cr := cr + coalesce((ln->>'cr')::numeric, (ln->>'credit')::numeric, 0);
  end loop;
  if p_status = 'published' and abs(dr - cr) > 0.005 then
    raise exception 'Journal unbalanced: DR % <> CR %', dr, cr;
  end if;
  e_id := 'je_' || gen_random_uuid()::text;
  select name into actor from public.profiles where id = public.current_profile_id();
  insert into public.fin_journal_entries(id,no,source,source_id,date,ref,notes,status,created_by)
  values(e_id, p_no, p_source, p_source_id, p_date, p_ref, p_notes, p_status, coalesce(actor,'Finance'));
  insert into public.fin_journal_lines(entry_id,account_id,debit,credit,memo,contact_id,site_id)
  select e_id,
         coalesce(l->>'accountId', l->>'account_id'),
         coalesce((l->>'dr')::numeric,(l->>'debit')::numeric,0),
         coalesce((l->>'cr')::numeric,(l->>'credit')::numeric,0),
         l->>'memo',
         coalesce(l->>'contactId', l->>'contact_id'),
         coalesce(l->>'siteId', l->>'site_id', p_site_id)
  from jsonb_array_elements(p_lines) l
  where coalesce((l->>'dr')::numeric,(l->>'debit')::numeric,0) > 0
     or coalesce((l->>'cr')::numeric,(l->>'credit')::numeric,0) > 0;
  insert into public.fin_activity(actor,action,ref)
  values(coalesce(actor,'Finance'), 'Posted journal ' || p_no, e_id);
  return e_id;
end $$;
revoke all on function public.post_journal(text,text,text,date,text,text,text,jsonb,text) from public;
grant execute on function public.post_journal(text,text,text,date,text,text,text,jsonb,text) to authenticated;

-- ── 6. Atomic document create: doc + its journal in one transaction ────────
create or replace function public.fin_create_document(p_doc jsonb, p_lines jsonb default null)
returns text language plpgsql security definer set search_path = '' as $$
declare d_id text; posted_src text; actor text;
begin
  perform public.fin_require_role();
  select name into actor from public.profiles where id=public.current_profile_id();
  if p_doc is null or p_doc->>'kind' is null or p_doc->>'no' is null or p_doc->>'date' is null then
    raise exception 'Document requires kind, number and date';
  end if;
  d_id := 'doc_' || gen_random_uuid()::text;
  insert into public.fin_documents(id,kind,no,date,status,contact_id,site_id,project_id,total,paid,due_date,payload,created_by)
  values(d_id, p_doc->>'kind', p_doc->>'no', (p_doc->>'date')::date,
         coalesce(p_doc->>'status','draft'), p_doc->>'contactId', p_doc->>'siteId',
         p_doc->>'projectId', coalesce((p_doc->>'total')::numeric,0), coalesce((p_doc->>'paid')::numeric,0),
         nullif(p_doc->>'dueDate','')::date, coalesce(p_doc->'payload','{}'::jsonb), coalesce(actor,'Finance'));
  if p_lines is not null and jsonb_typeof(p_lines) = 'array' and jsonb_array_length(p_lines) > 0 then
    posted_src := case when p_doc->>'kind' = 'journal' then 'journal' else p_doc->>'kind' end;
    perform public.post_journal(p_doc->>'no', posted_src, d_id, (p_doc->>'date')::date,
      null, (p_doc->'payload')->>'memo', 'published', p_lines, p_doc->>'siteId');
  end if;
  return d_id;
end $$;
revoke all on function public.fin_create_document(jsonb,jsonb) from public;
grant execute on function public.fin_create_document(jsonb,jsonb) to authenticated;

-- ── 7. Void / publish / reclassify / close-period RPCs ─────────────────────
create or replace function public.void_fin_document(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.fin_documents%rowtype; lock_until date; actor text;
begin
  perform public.fin_require_role();
  select * into d from public.fin_documents where id = p_id for update;
  if not found then raise exception 'Document not found'; end if;
  if d.status = 'void' then raise exception 'Document already void'; end if;
  select public.fin_locked_until() into lock_until;
  if d.kind <> 'lock' and lock_until is not null and d.date <= lock_until then
    raise exception 'Document is in a locked accounting period';
  end if;
  update public.fin_documents set status='void' where id=d.id;
  update public.fin_journal_entries set status='void' where source_id=d.id and status<>'void';
  select name into actor from public.profiles where id=public.current_profile_id();
  insert into public.fin_activity(actor,action,ref) values(coalesce(actor,'Finance'),'Voided ' || d.no, d.id);
end $$;
revoke all on function public.void_fin_document(text) from public;
grant execute on function public.void_fin_document(text) to authenticated;

create or replace function public.void_fin_journal(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.fin_journal_entries%rowtype; lock_until date; actor text;
begin
  perform public.fin_require_role();
  select * into e from public.fin_journal_entries where id=p_id for update;
  if not found then raise exception 'Journal entry not found'; end if;
  if e.status='void' then raise exception 'Journal already void'; end if;
  select public.fin_locked_until() into lock_until;
  if lock_until is not null and e.date <= lock_until then
    raise exception 'Journal is in a locked accounting period';
  end if;
  update public.fin_journal_entries set status='void' where id=e.id;
  select name into actor from public.profiles where id=public.current_profile_id();
  insert into public.fin_activity(actor,action,ref) values(coalesce(actor,'Finance'),'Voided journal ' || e.no, e.id);
end $$;
revoke all on function public.void_fin_journal(text) from public;
grant execute on function public.void_fin_journal(text) to authenticated;

create or replace function public.publish_fin_journal(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.fin_journal_entries%rowtype; dr numeric; cr numeric; lock_until date;
begin
  perform public.fin_require_role();
  select * into e from public.fin_journal_entries where id=p_id for update;
  if not found then raise exception 'Journal entry not found'; end if;
  if e.status <> 'draft' then raise exception 'Only draft journals can be published'; end if;
  select public.fin_locked_until() into lock_until;
  if lock_until is not null and e.date <= lock_until then
    raise exception 'Journal is in a locked accounting period';
  end if;
  select coalesce(sum(debit),0), coalesce(sum(credit),0) into dr, cr from public.fin_journal_lines where entry_id=e.id;
  if dr = 0 or abs(dr - cr) > 0.005 then raise exception 'Journal unbalanced: DR % <> CR %', dr, cr; end if;
  update public.fin_journal_entries set status='published' where id=e.id;
end $$;
revoke all on function public.publish_fin_journal(text) from public;
grant execute on function public.publish_fin_journal(text) to authenticated;

create or replace function public.reclassify_fin_lines(p_from text, p_to text)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer; lock_until date; actor text;
begin
  perform public.fin_require_role();
  select public.fin_locked_until() into lock_until;
  update public.fin_journal_lines l set account_id = p_to
  from public.fin_journal_entries e
  where e.id = l.entry_id and l.account_id = p_from
    and e.status = 'published'
    and (lock_until is null or e.date > lock_until);
  get diagnostics n = row_count;
  select name into actor from public.profiles where id=public.current_profile_id();
  insert into public.fin_activity(actor,action,ref) values(coalesce(actor,'Finance'),'Reclassified ' || n || ' journal lines', p_from || ' -> ' || p_to);
  return n;
end $$;
revoke all on function public.reclassify_fin_lines(text,text) from public;
grant execute on function public.reclassify_fin_lines(text,text) to authenticated;

-- Period close: persisted lock + reconciliation gate.
create or replace function public.close_finance_period(p_until date)
returns text language plpgsql security definer set search_path = '' as $$
declare unconfirmed integer; open_exc integer; lock_until date; l_id text; actor text;
begin
  perform public.fin_require_role();
  if p_until is null or p_until > current_date then raise exception 'Close date required (cannot be in the future)'; end if;
  select public.fin_locked_until() into lock_until;
  if lock_until is not null and p_until <= lock_until then raise exception 'Period already locked through %', lock_until; end if;
  select count(*) into unconfirmed from public.requests
  where status::text in ('PAID','CLOSED') and paid_at::date <= p_until and coalesce(recon_status,'') <> 'confirmed';
  select count(*) into open_exc from public.reconciliation_entries where state in ('exception','pending');
  if unconfirmed > 0 or open_exc > 0 then
    raise exception 'Close refused — % payment(s) unconfirmed, % open exception(s)', unconfirmed, open_exc;
  end if;
  l_id := 'doc_' || gen_random_uuid()::text;
  select name into actor from public.profiles where id=public.current_profile_id();
  insert into public.fin_documents(id,kind,no,date,status,payload,created_by)
  values(l_id,'lock','LOCK-' || to_char(now(),'YYYYMMDDHH24MISS'),p_until,'issued','{}'::jsonb,coalesce(actor,'Finance'));
  insert into public.fin_activity(actor,action,ref) values(coalesce(actor,'Finance'),'Closed accounting period through ' || p_until, l_id);
  return l_id;
end $$;
revoke all on function public.close_finance_period(date) from public;
grant execute on function public.close_finance_period(date) to authenticated;

-- ── 8. Facility payment: honour the category's mapped GL account; tag lines
--       with the facility so the trial balance is per-site correct. ─────────
drop function if exists public.record_facility_payment(text,uuid,date,text,text,numeric);
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
  expense_id := coalesce(nullif(c.account_id,''),
    case when lower(c.name) similar to '%(diesel|generator|power)%' then 'acc_6020'
         when lower(c.name) similar to '%(office|supplies)%' then 'acc_6040'
         when lower(c.name) similar to '%(travel|transport)%' then 'acc_6050' else 'acc_6030' end);
  insert into public.fin_journal_entries(id,no,source,source_id,date,ref,notes,created_by)
  values(journal_id,'FP-' || payment_id::text,'payment',r.id,p_paid_on,trim(p_reference),r.description,actor.name);
  insert into public.fin_journal_lines(entry_id,account_id,debit,credit,memo,site_id) values
    (journal_id,expense_id,gross,0,c.name,r.site_id),(journal_id,'acc_1100',0,net,'Payment recorded',r.site_id);
  if tax > 0 then insert into public.fin_journal_lines(entry_id,account_id,debit,credit,memo,site_id) values(journal_id,'acc_2110',0,tax,'WHT withheld',r.site_id); end if;
  insert into public.fin_activity(actor,action,ref) values(actor.name,'Recorded facility payment and category budget debit',r.request_number);
  return payment_id;
end $$;
revoke all on function public.record_facility_payment(text,uuid,date,text,text,numeric) from public;
grant execute on function public.record_facility_payment(text,uuid,date,text,text,numeric) to authenticated;
