-- 1. Update sheet_status enum
ALTER TYPE public.sheet_status ADD VALUE IF NOT EXISTS 'closed';

-- 2. Tagging system
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;

CREATE TABLE IF NOT EXISTS public.daily_entry_tags (
  entry_id uuid REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

GRANT SELECT, INSERT, DELETE ON public.daily_entry_tags TO authenticated;
GRANT ALL ON public.daily_entry_tags TO service_role;

-- 3. Next day reporter helper
CREATE OR REPLACE FUNCTION public.report_task_to_next_day(_task_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_task RECORD;
  v_new_day INTEGER;
  v_new_sheet_id UUID;
  v_new_task_id UUID;
  v_next_sheet_week_start DATE;
BEGIN
  -- Get the original task
  SELECT * INTO v_old_task FROM public.daily_entries WHERE id = _task_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Logic for finding the "next day"
  IF v_old_task.day < 5 THEN
    -- Same week, next day
    v_new_day := v_old_task.day + 1;
    v_new_sheet_id := v_old_task.sheet_id;
  ELSE
    -- Next week, Monday
    SELECT week_start + interval '7 days' INTO v_next_sheet_week_start 
    FROM public.weekly_sheets WHERE id = v_old_task.sheet_id;
    
    -- Try to find or create the next sheet
    SELECT id INTO v_new_sheet_id 
    FROM public.weekly_sheets 
    WHERE user_id = (SELECT user_id FROM public.weekly_sheets WHERE id = v_old_task.sheet_id)
      AND week_start = v_next_sheet_week_start;
      
    IF v_new_sheet_id IS NULL THEN
      INSERT INTO public.weekly_sheets (user_id, week_start, status)
      SELECT user_id, v_next_sheet_week_start, 'draft'
      FROM public.weekly_sheets WHERE id = v_old_task.sheet_id
      RETURNING id INTO v_new_sheet_id;
    END IF;
    
    v_new_day := 1;
  END IF;

  -- Insert the cloned task
  INSERT INTO public.daily_entries (
    sheet_id, day, heure, tache, statut, position
  ) VALUES (
    v_new_sheet_id, v_new_day, v_old_task.heure, v_old_task.tache, 'in_progress',
    (SELECT COALESCE(MAX(position), 0) + 1 FROM public.daily_entries WHERE sheet_id = v_new_sheet_id AND day = v_new_day)
  ) RETURNING id INTO v_new_task_id;

  -- Update original task to mark it as reported if needed (business logic)
  -- UPDATE public.daily_entries SET statut = 'postponed' WHERE id = _task_id;

  RETURN v_new_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_task_to_next_day(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_task_to_next_day(uuid) TO service_role;
