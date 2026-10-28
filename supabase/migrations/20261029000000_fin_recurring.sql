-- Recurring invoice templates + generator (runs via pg_cron when available, and lazily via RPC on app load).

create table if not exists public.fin_recurring (
  id text primary key default ('rec_' || gen_random_uuid()::text),
  contact_id text not null references public.fin_contacts(id),
  lines jsonb not null default '[]'::jsonb,   -- [{ accountId, amount, memo }]
  vat numeric not null default 0,
  day_of_month integer not null default 1,
  next_run date not null,
  end_date date,
  memo text,
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table public.fin_recurring enable row level security;
drop policy if exists fin_recurring_read on public.fin_recurring;
create policy fin_recurring_read on public.fin_recurring for select to authenticated using (public.current_role() in ('finance','admin','supervisor'));
drop policy if exists fin_recurring_write on public.fin_recurring;
create policy fin_recurring_write on public.fin_recurring for all to authenticated using (public.current_role() in ('finance','admin')) with check (public.current_role() in ('finance','admin'));

-- Generate invoices for every template whose next_run is due. Mirrors the client invoice posting:
-- DR 1200 Accounts receivable (total incl. VAT) / CR income lines / CR 2100 VAT output.
create or replace function public.run_recurring_invoices() returns integer
language plpgsql security definer set search_path = public
as $$
declare
  t record; l jsonb;
  doc_id text; entry_id text;
  seq int; doc_no text;
  subtotal numeric; total numeric;
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

    select coalesce(max(nullif(regexp_replace(no, '\D', '', 'g'), '')::int), 0) + 1
      into seq from public.fin_documents where kind = 'invoice';
    doc_no := 'INV-' || lpad(seq::text, 4, '0');
    doc_id := 'doc_' || gen_random_uuid()::text;
    entry_id := 'je_' || gen_random_uuid()::text;

    insert into public.fin_documents (id, kind, no, date, status, contact_id, total, paid, due_date, payload, created_by)
    values (doc_id, 'invoice', doc_no, t.next_run, 'issued', t.contact_id, total, 0,
            t.next_run + 30, jsonb_build_object('lines', t.lines, 'memo', t.memo, 'recurring', t.id), 'recurring-engine');

    insert into public.fin_journal_entries (id, no, source, source_id, date, ref, status, created_by)
    values (entry_id, doc_no, 'invoice', doc_id, t.next_run, t.memo, 'published', 'recurring-engine');

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

    insert into public.fin_activity (actor, action, ref)
    values ('recurring-engine', 'Generated recurring invoice ' || doc_no || ' ₦' || total::text, doc_no);

    update public.fin_recurring set
      next_run = (t.next_run + interval '1 month')::date,
      active = (t.end_date is null or (t.next_run + interval '1 month')::date <= t.end_date)
    where id = t.id;
    made := made + 1;
  end loop;
  return made;
end $$;

revoke all on function public.run_recurring_invoices() from public;
grant execute on function public.run_recurring_invoices() to authenticated;

-- Daily schedule at 06:00 when pg_cron is available on this project.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('run-recurring-invoices', '0 6 * * *', 'select public.run_recurring_invoices()');
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end $$;
