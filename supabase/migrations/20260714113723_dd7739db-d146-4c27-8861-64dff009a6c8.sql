
UPDATE public.profiles SET first_name = 'Mr'   WHERE first_name IN ('M.', 'M', 'Mr.');
UPDATE public.profiles SET first_name = 'Miss' WHERE first_name IN ('Mlle', 'Mme', 'Mrs', 'Ms');
