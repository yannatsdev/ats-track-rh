revoke execute on function public.has_role(_user_id uuid, _role app_role) from public, authenticated, anon;
grant execute on function public.has_role(_user_id uuid, _role app_role) to service_role;

revoke execute on function public.is_staff(_user_id uuid) from public, authenticated, anon;
grant execute on function public.is_staff(_user_id uuid) to service_role;
