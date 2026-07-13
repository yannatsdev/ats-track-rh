-- Ensure the pgcrypto extension is available for password hashing
create extension if not exists pgcrypto;

-- Reset passwords + confirm emails for the default admin accounts
update auth.users
set encrypted_password = crypt('JesuisadminpassRH$', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where email = 'adminrh1@gmail.com';

update auth.users
set encrypted_password = crypt('WellprotectedadminpassRH$', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where email = 'adminrh2@gmail.com';

-- Ensure admin role is set (idempotent) and remove the default employee role for clarity
insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role from auth.users u
where u.email in ('adminrh1@gmail.com','adminrh2@gmail.com')
on conflict (user_id, role) do nothing;

-- Also update profile display names
update public.profiles p
set first_name = 'Admin', last_name = 'RH 1'
from auth.users u
where p.id = u.id and u.email = 'adminrh1@gmail.com';

update public.profiles p
set first_name = 'Admin', last_name = 'RH 2'
from auth.users u
where p.id = u.id and u.email = 'adminrh2@gmail.com';