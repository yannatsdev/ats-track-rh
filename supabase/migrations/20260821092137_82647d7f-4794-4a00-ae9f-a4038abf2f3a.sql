-- Mettre à jour le service de Miss Davilla en RH
UPDATE public.profiles
SET service = 'RH'
WHERE id = '1e5f0327-4fc7-4374-9772-cf8cab74fe73';

-- S'assurer qu'elle a le rôle 'hr'
INSERT INTO public.user_roles (user_id, role)
VALUES ('1e5f0327-4fc7-4374-9772-cf8cab74fe73', 'hr')
ON CONFLICT (user_id, role) DO NOTHING;
