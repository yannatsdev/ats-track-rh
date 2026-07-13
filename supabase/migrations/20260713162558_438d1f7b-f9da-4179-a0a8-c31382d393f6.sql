
-- ROLES
create type public.app_role as enum ('employee', 'hr', 'direction', 'admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('hr','direction','admin')
  )
$$;

create policy "Users can view their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Staff can view all roles" on public.user_roles
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "Admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  fonction text,
  service text,
  avatar_url text,
  manager_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Staff can view all profiles" on public.profiles
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admins manage profiles" on public.profiles
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Auto profile + role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'first_name',''),
          coalesce(new.raw_user_meta_data->>'last_name',''));
  insert into public.user_roles (user_id, role) values (new.id, 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- SHEET STATUS ENUM
create type public.sheet_status as enum ('draft','submitted','hr_validated','direction_validated','rejected');
create type public.task_status as enum ('done','in_progress','postponed');

-- WEEKLY SHEETS
create table public.weekly_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  status public.sheet_status not null default 'draft',
  avancement_global int not null default 0,
  difficultes text,
  observations text,
  bilan_realisations text,
  bilan_dossiers text,
  bilan_difficultes text,
  bilan_actions text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

grant select, insert, update, delete on public.weekly_sheets to authenticated;
grant all on public.weekly_sheets to service_role;
alter table public.weekly_sheets enable row level security;

create policy "Users manage own sheets" on public.weekly_sheets
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Staff view all sheets" on public.weekly_sheets
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff update sheets" on public.weekly_sheets
  for update to authenticated using (public.is_staff(auth.uid()));

create trigger sheets_touch before update on public.weekly_sheets
  for each row execute function public.touch_updated_at();

-- DAILY ENTRIES
create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.weekly_sheets(id) on delete cascade,
  day smallint not null check (day between 1 and 5),
  heure text,
  tache text not null default '',
  resultat text,
  statut public.task_status not null default 'in_progress',
  motif_report text,
  avancement_pct int not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.daily_entries to authenticated;
grant all on public.daily_entries to service_role;
alter table public.daily_entries enable row level security;

create policy "Users manage own daily entries" on public.daily_entries
  for all to authenticated using (
    exists (select 1 from public.weekly_sheets s where s.id = sheet_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.weekly_sheets s where s.id = sheet_id and s.user_id = auth.uid())
  );
create policy "Staff view all entries" on public.daily_entries
  for select to authenticated using (public.is_staff(auth.uid()));

-- VALIDATIONS
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.weekly_sheets(id) on delete cascade,
  validator_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  commentaire text,
  statut text not null default 'pending',
  validated_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.validations to authenticated;
grant all on public.validations to service_role;
alter table public.validations enable row level security;

create policy "Owner sees validations" on public.validations
  for select to authenticated using (
    exists (select 1 from public.weekly_sheets s where s.id = sheet_id and s.user_id = auth.uid())
  );
create policy "Staff view validations" on public.validations
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff insert validations" on public.validations
  for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "Staff update validations" on public.validations
  for update to authenticated using (public.is_staff(auth.uid()));

create index on public.weekly_sheets (user_id, week_start desc);
create index on public.daily_entries (sheet_id, day, position);
create index on public.validations (sheet_id);
