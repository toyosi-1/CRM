-- Recurring profiles extended to expenses (Purchases ▸ Recurring expenses) + weekly/monthly/yearly frequency.

alter table public.fin_recurring add column if not exists kind text not null default 'invoice';
alter table public.fin_recurring add column if not exists name text;
alter table public.fin_recurring add column if not exists frequency text not null default 'monthly';
alter table public.fin_recurring add column if not exists paid_through_id text;
alter table public.fin_recurring alter column contact_id drop not null;

-- Generate due documents for both kinds. Invoice: DR 1200 / CR income lines / CR 2100.
-- Expense: DR expense lines (+DR 1330 input VAT) / CR paid-through account. Advances next_run by frequency.
create or replace function public.run_recurring_invoices() returns integer
language plpgsql security definer set search_path = public
as $$
declare
  t record; l jsonb;
  doc_id text; entry_id text;
  seq int; doc_no text; prefix text;
  subtotal numeric; total numeric;
  nxt date;
  made int := 0;
begin
  if public.current_role() not in ('finance','admin') and session_user <> 'postgres' then
    raise exception 'Finance or admin access required';
  end if;

  for t in select * from public.fin_recurring where active and next_run <= current_date loop
    subtotal := coalesce((select sum((x->>'amount')::numeric) from jsonb_array_elements(t.lines) x), 0);
    if subtotal <= 0 then
      update public.fin_recurring set active = false where id = t.id; continue;
    end if;
    total := round(subtotal + t.vat, 2);
    doc_id := 'doc_' || gen_random_uuid()::text;
    entry_id := 'je_' || gen_random_uuid()::text;

    if t.kind = 'expense' then
      prefix := 'EXP';
    else
      prefix := 'INV';
    end if;
    select coalesce(max(nullif(regexp_replace(no, '\D', '', 'g'), '')::int), 0) + 1
      into seq from public.fin_documents where kind = t.kind;
    doc_no := prefix || '-' || lpad(seq::text, 4, '0');

    insert into public.fin_documents (id, kind, no, date, status, contact_id, total, paid, due_date, payload, created_by)
    values (doc_id, case when t.kind = 'expense' then 'expense' else 'invoice' end,
            doc_no, t.next_run, case when t.kind = 'expense' then 'paid' else 'issued' end,
            t.contact_id, total, case when t.kind = 'expense' then total else 0 end,
            case when t.kind = 'expense' then null else t.next_run + 30 end,
            jsonb_build_object('lines', t.lines, 'memo', t.memo, 'recurring', t.id, 'name', t.name), 'recurring-engine');

    insert into public.fin_journal_entries (id, no, source, source_id, date, ref, status, created_by)
    values (entry_id, doc_no, case when t.kind = 'expense' then 'expense' else 'invoice' end,
            doc_id, t.next_run, coalesce(t.name, t.memo), 'published', 'recurring-engine');

    if t.kind = 'expense' then
      for l in select * from jsonb_array_elements(t.lines) loop
        insert into public.fin_journal_lines (entry_id, account_id, debit, credit, memo)
        values (entry_id, l->>'accountId', (l->>'amount')::numeric, 0, l->>'memo');
      end loop;
      if t.vat > 0 then
        insert into public.fin_journal_lines (entry_id, account_id, debit, credit, memo)
        values (entry_id, 'acc_1330', t.vat, 0, 'VAT input');
      end if;
      insert into public.fin_journal_lines (entry_id, account_id, debit, credit, memo)
      values (entry_id, coalesce(t.paid_through_id, 'acc_1000'), 0, total, 'Paid — recurring expense');
    else
      insert into public.fin_journal_lines (entry_id, account_id, debit, credit, memo)
      values (entry_id, 'acc_1200', total, 0, 'AR — recurring invoice');
      for l in select * from jsonb_array_elements(t.lines) loop
        insert into public.fin_journal_lines (entry_id, account_id, debit, credit, memo)
        values (entry_id, l->>'accountId', 0, (l->>'amount')::numeric, l->>'memo');
      end loop;
      if t.vat > 0 then
        insert into public.fin_journal_lines (entry_id, account_id, debit, credit, memo)
        values (entry_id, 'acc_2100', 0, t.vat, 'VAT output');
      end if;
    end if;

    insert into public.fin_activity (actor, action, ref)
    values ('recurring-engine', 'Generated recurring ' || lower(prefix) || ' ' || doc_no || ' ₦' || total::text, doc_no);

    nxt := case t.frequency
      when 'weekly' then (t.next_run + interval '1 week')::date
      when 'yearly' then (t.next_run + interval '1 year')::date
      else (t.next_run + interval '1 month')::date
    end;
    update public.fin_recurring set
      next_run = nxt,
      active = (t.end_date is null or nxt <= t.end_date)
    where id = t.id;
    made := made + 1;
  end loop;
  return made;
end $$;
