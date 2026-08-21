-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entry_tags ENABLE ROW LEVEL SECURITY;

-- Policies for tags
CREATE POLICY "Everyone authenticated can view tags" ON public.tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Policies for daily_entry_tags
CREATE POLICY "Users can manage their own entry tags" ON public.daily_entry_tags
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.daily_entries e
      JOIN public.weekly_sheets s ON e.sheet_id = s.id
      WHERE e.id = entry_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY "Staff can view all entry tags" ON public.daily_entry_tags
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Revoke public execution for security definer functions
REVOKE EXECUTE ON FUNCTION public.report_task_to_next_day(uuid) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.report_task_to_next_day(uuid) TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_staff(_user_id uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(_user_id uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated, service_role;
