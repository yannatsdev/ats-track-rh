create table if not exists public.day_notes (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.weekly_sheets(id) on delete cascade,
  day int not null check (day between 1 and 5),
  motif_report text,
  avancement_pct int not null default 0,
  difficultes text,
  observations text,
  updated_at timestamptz not null default now(),
  unique (sheet_id, day)
);
grant select, insert, update, delete on public.day_notes to authenticated;
grant all on public.day_notes to service_role;
alter table public.day_notes enable row level security;
create policy "Users manage own day notes" on public.day_notes for all to authenticated
  using (exists (select 1 from public.weekly_sheets s where s.id = sheet_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.weekly_sheets s where s.id = sheet_id and s.user_id = auth.uid()));
create policy "Staff view all day notes" on public.day_notes for select to authenticated
  using (public.has_role(auth.uid(), 'hr') or public.has_role(auth.uid(), 'direction') or public.has_role(auth.uid(), 'admin'));
create index if not exists day_notes_sheet_day_idx on public.day_notes (sheet_id, day);