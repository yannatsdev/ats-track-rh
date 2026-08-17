
DO $$
BEGIN
    -- Suppression des utilisateurs correspondant à "Miss Kanga" et "Ange Audrey"
    DELETE FROM auth.users WHERE id IN (
        'c749a3f3-1d13-45bb-8d60-2e346972794f', -- Mlle Kanga (stagecommunicationlysdemarie@gmail.com)
        '86c897ee-3411-4f54-9ad3-46bde3b7710c', -- Ange Audrey (kanga@lys26)
        '683d31b2-ae23-4469-9370-31ef39763932'  -- Ange Audrey (kanga@lys2)
    );
END $$;
