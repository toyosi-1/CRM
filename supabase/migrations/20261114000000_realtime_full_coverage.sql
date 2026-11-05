-- Realtime coverage for reference/lookup tables so every dashboard updates
-- instantly (no manual refresh) when staff, sites, vendors or assets change.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'sites', 'vendors', 'assets',
    'service_charge_invoices', 'facility_vendor_slas'
  ] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t)
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
