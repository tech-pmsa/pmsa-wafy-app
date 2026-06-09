alter table public.internal_morning_talk_attendance
add column if not exists mark integer not null default 0 check (mark between 0 and 10);

alter table public.internal_f_talk_marks
add column if not exists mark integer not null default 0 check (mark between 0 and 10);

create table if not exists public.internal_student_skills (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  skill_name text not null,
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_uid, skill_name)
);

create index if not exists internal_student_skills_student_uid_idx
on public.internal_student_skills(student_uid);

alter table public.internal_student_skills enable row level security;

grant select, insert, update, delete on public.internal_student_skills to authenticated;

drop policy if exists "Internal student skills class teacher access"
on public.internal_student_skills;

create policy "Internal student skills class teacher access"
on public.internal_student_skills for all to authenticated
using (public.internal_marks_row_allowed(student_uid))
with check (public.internal_marks_row_allowed(student_uid));
