alter table public.students
add column if not exists dob date;

create table if not exists public.homework_subjects (
  id uuid primary key default gen_random_uuid(),
  batch text not null,
  name text not null,
  created_by uuid references public.profiles(uid) on delete cascade,
  created_at timestamptz not null default now(),
  unique (batch, name)
);

create table if not exists public.homework_assignments (
  id uuid primary key default gen_random_uuid(),
  batch text not null,
  subject_id uuid references public.homework_subjects(id) on delete set null,
  subject_name text not null,
  homework_date date not null,
  total_mark numeric not null default 0 check (total_mark >= 0),
  created_by uuid references public.profiles(uid) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homework_marks (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework_assignments(id) on delete cascade,
  student_uid uuid not null references public.students(uid) on delete cascade,
  mark numeric not null default 0 check (mark >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_uid)
);

create index if not exists homework_subjects_batch_idx on public.homework_subjects(batch);
create index if not exists homework_assignments_batch_date_idx on public.homework_assignments(batch, homework_date);
create index if not exists homework_marks_homework_student_idx on public.homework_marks(homework_id, student_uid);

drop trigger if exists trg_homework_assignments_set_updated_at on public.homework_assignments;
create trigger trg_homework_assignments_set_updated_at before update on public.homework_assignments
for each row execute function public.set_updated_at();

drop trigger if exists trg_homework_marks_set_updated_at on public.homework_marks;
create trigger trg_homework_marks_set_updated_at before update on public.homework_marks
for each row execute function public.set_updated_at();

alter table public.homework_subjects enable row level security;
alter table public.homework_assignments enable row level security;
alter table public.homework_marks enable row level security;

grant select, insert, update, delete on public.homework_subjects to authenticated;
grant select, insert, update, delete on public.homework_assignments to authenticated;
grant select, insert, update, delete on public.homework_marks to authenticated;

create or replace function public.homework_batch_allowed(p_batch text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.uid = auth.uid()
      and p.role = 'class'
      and public.profile_batch_number(p.batch) >= 17
      and p.batch = p_batch
  );
$$;

grant execute on function public.homework_batch_allowed(text) to authenticated;

drop policy if exists "Homework subjects class teacher access" on public.homework_subjects;
create policy "Homework subjects class teacher access"
on public.homework_subjects for all to authenticated
using (public.homework_batch_allowed(batch))
with check (public.homework_batch_allowed(batch));

drop policy if exists "Homework assignments class teacher access" on public.homework_assignments;
create policy "Homework assignments class teacher access"
on public.homework_assignments for all to authenticated
using (public.homework_batch_allowed(batch))
with check (public.homework_batch_allowed(batch));

drop policy if exists "Homework marks class teacher access" on public.homework_marks;
create policy "Homework marks class teacher access"
on public.homework_marks for all to authenticated
using (
  exists (
    select 1
    from public.homework_assignments h
    where h.id = homework_id
      and public.homework_batch_allowed(h.batch)
  )
)
with check (
  exists (
    select 1
    from public.homework_assignments h
    join public.students s on s.uid = student_uid
    where h.id = homework_id
      and s.batch = h.batch
      and public.homework_batch_allowed(h.batch)
  )
);
