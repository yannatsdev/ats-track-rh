do $$
declare
  new_user_id uuid := gen_random_uuid();
begin
  -- Insert into auth.users
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    aud,
    role
  )
  values (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'rhdavilla@gmail.com',
    extensions.crypt('RHDavilla@Lys26', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Mlle","last_name":"Davilla"}',
    now(),
    now(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );

  -- Insert identity
  insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
  values (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id, 'rhdavilla@gmail.com')::jsonb,
    'email',
    now(),
    now(),
    now(),
    new_user_id::text
  );

  -- Assign roles
  insert into public.user_roles (user_id, role)
  values (new_user_id, 'employee')
  on conflict do nothing;
  
  insert into public.user_roles (user_id, role)
  values (new_user_id, 'hr')
  on conflict do nothing;

  -- Profile
  insert into public.profiles (id, first_name, last_name, service, fonction)
  values (new_user_id, 'Mlle', 'Davilla', 'RH', 'RH')
  on conflict (id) do update 
  set service = 'RH', fonction = 'RH';
end $$;
