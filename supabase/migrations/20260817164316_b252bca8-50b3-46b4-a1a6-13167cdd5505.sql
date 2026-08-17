-- Update user profile and password
-- Current: Mr Obou (servicetechnique466@gmail.com)
-- New: Miss Davilla

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'servicetechnique466@gmail.com';

    IF v_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET first_name = 'Miss',
            last_name = 'Davilla'
        WHERE id = v_user_id;

        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object('first_name', 'Miss', 'last_name', 'Davilla'),
            encrypted_password = extensions.crypt('Davilla@Lys26', extensions.gen_salt('bf')),
            updated_at = now()
        WHERE id = v_user_id;

        UPDATE auth.identities
        SET identity_data = jsonb_build_object('sub', v_user_id::text, 'email', 'servicetechnique466@gmail.com', 'email_verified', true, 'first_name', 'Miss', 'last_name', 'Davilla')
        WHERE user_id = v_user_id;
    END IF;
END $$;
