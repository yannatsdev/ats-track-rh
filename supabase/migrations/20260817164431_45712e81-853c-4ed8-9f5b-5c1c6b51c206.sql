
-- Mise à jour de l'admin RH
-- Email actuel : obourh1@gmail.com -> Nouvel email : davillarh@gmail.com
-- Mot de passe actuel : Obou@Lys26 -> Nouveau mot de passe : Davilla@Lys26

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'obourh1@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- Mise à jour de l'email et du mot de passe dans auth.users
        UPDATE auth.users
        SET email = 'davillarh@gmail.com',
            encrypted_password = extensions.crypt('Davilla@Lys26', extensions.gen_salt('bf')),
            raw_user_meta_data = jsonb_build_object('first_name', 'Miss', 'last_name', 'Davilla'),
            email_confirmed_at = now(),
            updated_at = now()
        WHERE id = v_user_id;

        -- Mise à jour de l'identité (on ne touche pas à la colonne 'email' qui est générée)
        UPDATE auth.identities
        SET identity_data = jsonb_build_object(
                'sub', v_user_id::text,
                'email', 'davillarh@gmail.com',
                'email_verified', true,
                'first_name', 'Miss',
                'last_name', 'Davilla'
            )
        WHERE user_id = v_user_id;

        -- Mise à jour du profil public
        UPDATE public.profiles
        SET first_name = 'Miss',
            last_name = 'Davilla'
        WHERE id = v_user_id;
    END IF;
END $$;
