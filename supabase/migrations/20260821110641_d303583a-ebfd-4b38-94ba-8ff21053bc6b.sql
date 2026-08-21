ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS motif_pause text DEFAULT '';
GRANT ALL ON public.daily_entries TO authenticated;
GRANT ALL ON public.daily_entries TO service_role;