GRANT EXECUTE ON FUNCTION public.is_staff(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_staff(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
