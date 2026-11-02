-- Internal commentary on requests (FM instructions to procurement/finance, e.g. "pay 50% now")
alter table public.requests add column if not exists internal_note text;
