-- Forensic accounting additions: per-line contact on journal lines (Zoho "Contact" column in manual journals).

alter table public.fin_journal_lines add column if not exists contact_id text;
