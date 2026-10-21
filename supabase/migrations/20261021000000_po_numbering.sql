-- Deterministic PO numbering: PO-{SITE}-{MMYY}-{####}, sequential per site+month.
-- Mirrors generate_request_number so POs are traceable and cannot collide.
CREATE OR REPLACE FUNCTION public.generate_po_number(p_site_id text, p_created_at timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  v_site_code text;
  v_prefix text;
  v_next_seq integer;
begin
  v_site_code := case p_site_id
    when 'SITE-OSD' then 'OSD'
    when 'SITE-MCK' then 'MCK'
    when 'SITE-JUS' then 'JST'
    when 'SITE-ADU' then 'ADL'
    when 'SITE-MAR' then 'MCT'
    else upper(left(split_part((select name from public.sites where id = p_site_id), ' ', 1), 3))
  end;

  v_prefix := 'PO-' || v_site_code || '-' || to_char(p_created_at, 'MMYY') || '-';

  select coalesce(max(nullif(regexp_replace(purchase_order ->> 'poNumber', '^' || v_prefix, ''), purchase_order ->> 'poNumber')::integer), 0) + 1
  into v_next_seq
  from public.requests
  where purchase_order ->> 'poNumber' like v_prefix || '%';

  return v_prefix || lpad(v_next_seq::text, 4, '0');
end;
$$;
