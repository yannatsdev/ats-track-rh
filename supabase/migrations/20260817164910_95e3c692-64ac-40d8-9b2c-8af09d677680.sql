
-- S'assurer que Miss Davilla a le rôle HR
DO $$
DECLARE
    v_user_id uuid;
    v_hr_role_id uuid;
BEGIN
    -- 1. Récupérer l'ID de Miss Davilla (récemment mis à jour vers davillarh@gmail.com)
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'davillarh@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- 2. Vérifier si elle a déjà le rôle 'hr' dans la table user_roles
        -- Note: On suppose que le type enum public.app_role contient 'hr' 
        -- ou que c'est géré via la table user_roles.
        
        -- Si la table user_roles utilise un enum 'hr', on l'insère.
        -- Si elle n'a pas encore le rôle, on l'ajoute.
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'hr')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- On s'assure aussi qu'elle a le rôle 'admin' car c'est l'admin RH
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
