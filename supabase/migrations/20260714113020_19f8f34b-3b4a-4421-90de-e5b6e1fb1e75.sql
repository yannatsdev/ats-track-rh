
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Reset operational data
DELETE FROM public.validations;
DELETE FROM public.day_notes;
DELETE FROM public.daily_entries;
DELETE FROM public.weekly_sheets;

-- Existing "admin RH" users → HR only
DELETE FROM public.user_roles WHERE role = 'admin'
  AND user_id IN ('eff9327c-2b8e-4764-a6ed-60ae037fc969','439baf05-55ca-4824-8402-6a364aa903c3');
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'hr'::app_role FROM auth.users
WHERE id IN ('eff9327c-2b8e-4764-a6ed-60ae037fc969','439baf05-55ca-4824-8402-6a364aa903c3')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public._seed_user(
  p_email text, p_password text, p_first text, p_last text,
  p_role app_role, p_fonction text DEFAULT NULL, p_service text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id,
      'authenticated','authenticated', p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', p_first, 'last_name', p_last),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id,
      jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
      'email', v_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, fonction, service, active)
  VALUES (v_id, p_first, p_last, p_fonction, p_service, true)
  ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
        fonction = COALESCE(EXCLUDED.fonction, public.profiles.fonction),
        service  = COALESCE(EXCLUDED.service,  public.profiles.service),
        active = true;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_id, p_role) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'employee') ON CONFLICT DO NOTHING;
  RETURN v_id;
END; $$;

SELECT public._seed_user('servicearchivelys@gmail.com',           'Sonda@Lys26',    'M.',   'Sonda',   'employee','Archiviste','Archives');
SELECT public._seed_user('stagecommunicationlysdemarie@gmail.com','Kanga@Lys26',    'Mlle', 'Kanga',   'employee','Stagiaire Communication','Communication');
SELECT public._seed_user('servicetopographique356@gmail.com',     'Kadjo@Lys26',    'M.',   'Kadjo',   'employee','Topographe','Topographie');
SELECT public._seed_user('commerciallysbio@gmail.com',            'Kouassi@Lys26',  'M.',   'Kouassi', 'employee','Commercial','Commercial');
SELECT public._seed_user('comptarlys@gmail.com',                  'Ouattara@Lys26', 'M.',   'Ouattara','employee','Comptable','Comptabilité');
SELECT public._seed_user('infolysdemarie24@gmail.com',            'Nadia@Lys26',    'Mlle', 'Nadia',   'employee','Informatique','IT');
SELECT public._seed_user('comptarlysdemarie@gmail.com',           'Djan@Lys26',     'M.',   'Djan',    'employee','Comptable','Comptabilité');
SELECT public._seed_user('servicetechnique466@gmail.com',         'Obou@Lys26',     'M.',   'Obou',    'employee','Technicien','Technique');

SELECT public._seed_user('ndouffoumar@gmail.com', 'Admindgmarlys1$', 'Direction', 'Générale', 'admin', 'Directeur Général', 'Direction');
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'direction'::app_role FROM auth.users WHERE email = 'ndouffoumar@gmail.com'
ON CONFLICT DO NOTHING;

DROP FUNCTION public._seed_user(text, text, text, text, app_role, text, text);
