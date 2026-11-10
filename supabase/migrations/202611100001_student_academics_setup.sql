-- Migration: Student Academics table, indexes, and RLS policies
-- Supports +1, +2, Degree (UG/PG/Integrated with semester CGPA), and Diploma courses.

create table if not exists public.student_academics (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  student_name text not null,
  student_cic text,
  class_id text,
  batch text,
  academic_type text not null check (academic_type in ('+1', '+2', 'degree', 'diploma')),
  
  -- Fields for +1, +2, and general education
  academic_year text,
  school_name text,
  school_location text,
  school_type text,      -- 'Govt', 'Govt Aided', 'Private', 'Other'
  study_mode text,        -- 'Regular', 'Open School', 'Private', 'Distance Education'
  board text,             -- 'Kerala State Board', 'CBSE', 'ICSE', 'NIOS', 'Other'
  stream text,            -- 'Science', 'Commerce', 'Humanities', 'Other'
  result text,            -- 'passed', 'failed', 'appearing'
  subjects jsonb default '[]'::jsonb, -- array of { subject_name, grade_or_mark, status: 'passed' | 'failed' }

  -- Fields for Degree
  degree_status text,     -- 'Completed', 'Studying', 'Result Awaited', 'Arrear/Backlog', 'Discontinued'
  degree_level text,      -- 'UG', 'PG', 'Integrated Degree'
  course_name text,       -- 'BA', 'BSc', 'MA', etc.
  course_specialisation text, -- 'English', 'Arabic', 'Politics', etc.
  academic_scheme text,   -- 'FYUGP', 'CBCSS', 'Other'
  university text,        -- 'Calicut', 'Kannur', 'Kerala', etc.
  admission_year text,    -- '2023', '2024', etc.
  total_semesters integer default 6,
  semester_data jsonb default '[]'::jsonb, -- array of { semester_no, cgpa, subjects: [...] }

  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for optimal querying
create index if not exists student_academics_student_uid_idx on public.student_academics(student_uid);
create index if not exists student_academics_type_idx on public.student_academics(academic_type);
create index if not exists student_academics_batch_idx on public.student_academics(batch);
create index if not exists student_academics_class_id_idx on public.student_academics(class_id);

-- Enable RLS
alter table public.student_academics enable row level security;

-- Grants
grant select, insert, update, delete on public.student_academics to authenticated;

-- RLS SELECT Policy
drop policy if exists "Student academics select policy" on public.student_academics;
create policy "Student academics select policy"
on public.student_academics for select to authenticated
using (
  student_uid = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_or_leader_for_batch(batch)
  or public.is_class_or_leader_for_batch(class_id)
);

-- RLS WRITE (ALL) Policy
drop policy if exists "Student academics write policy" on public.student_academics;
create policy "Student academics write policy"
on public.student_academics for all to authenticated
using (
  student_uid = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_leader_for_batch(batch)
  or public.is_class_leader_for_batch(class_id)
)
with check (
  student_uid = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_leader_for_batch(batch)
  or public.is_class_leader_for_batch(class_id)
);
