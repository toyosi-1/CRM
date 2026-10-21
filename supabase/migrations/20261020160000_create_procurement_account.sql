-- Create procurement account for Abulrasaq Basira
-- NOTE: initial password redacted before publishing to Git; the account already exists.
DO $$
declare
  auth_id uuid;
  profile_id uuid := gen_random_uuid();
  site_ids text[];
  existing_user auth.users%rowtype;
begin
  select array_agg(id) into site_ids from public.sites;

  select * into existing_user from auth.users where email = 'basira.abulrasaq@propelpfm.com' limit 1;

  if found then
    auth_id := existing_user.id;
    update auth.users set
      encrypted_password = crypt('REDACTED_APPLIED_WITH_REAL_PASSWORD', gen_salt('bf')),
      email_confirmed_at = coalesce(existing_user.email_confirmed_at, now()),
      updated_at = now(),
      raw_user_meta_data = '{"name":"Abulrasaq Basira","role":"procurement","department":"Procurement","phone":""}'::jsonb
    where id = auth_id;
  else
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user)
    values (
      gen_random_uuid(),
      'basira.abulrasaq@propelpfm.com',
      crypt('REDACTED_APPLIED_WITH_REAL_PASSWORD', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Abulrasaq Basira","role":"procurement","department":"Procurement","phone":""}'::jsonb,
      now(),
      now(),
      false
    )
    returning id into auth_id;
  end if;

  -- Ensure identity row exists
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    'basira.abulrasaq@propelpfm.com',
    auth_id,
    jsonb_build_object('sub', auth_id::text, 'email', 'basira.abulrasaq@propelpfm.com'),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update set
    identity_data = excluded.identity_data,
    updated_at = now();

  -- Create or update profile
  insert into public.profiles (id, auth_user_id, name, email, phone, role, site_id, site_ids, department, trade, active)
  values (
    profile_id,
    auth_id,
    'Abulrasaq Basira',
    'basira.abulrasaq@propelpfm.com',
    '',
    'procurement',
    null,
    site_ids,
    'Procurement',
    '',
    true
  )
  on conflict (email) do update set
    name = excluded.name,
    auth_user_id = excluded.auth_user_id,
    role = excluded.role,
    active = excluded.active,
    site_ids = excluded.site_ids;
end $$;
