
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'davillarh1@gmail.com',
    crypt('Davilla@Lys26', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Miss Davilla","first_name":"Davilla","civility":"Miss","service":"RH","function":"RH"}',
    false,
    'authenticated',
    'authenticated',
    now(),
    now()
);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'davillarh1@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'hr' FROM auth.users WHERE email = 'davillarh1@gmail.com';
