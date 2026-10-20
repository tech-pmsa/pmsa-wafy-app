-- Migration: CBCSS (Choice Based Credit Semester System) tables and RLS policies

create table if not exists public.cbcss_records (
  id uuid primary key default gen_random_uuid(),
  batch text not null,
  semester text not null check (semester in ('SEM-1', 'SEM-2')) default 'SEM-1',
  course_type text not null check (course_type in ('OFF COURSE', 'IN COURSE')),
  course_name text not null,
  instead_of text not null,
  credits numeric not null default 0,
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cbcss_students (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.cbcss_records(id) on delete cascade,
  student_uid uuid not null references public.students(uid) on delete cascade,
  student_name text not null,
  cic text,
  created_at timestamptz not null default now(),
  unique (record_id, student_uid)
);

create index if not exists cbcss_records_batch_semester_idx on public.cbcss_records(batch, semester);
create index if not exists cbcss_students_record_idx on public.cbcss_students(record_id);

alter table public.cbcss_records enable row level security;
alter table public.cbcss_students enable row level security;

grant select, insert, update, delete on public.cbcss_records to authenticated;
grant select, insert, update, delete on public.cbcss_students to authenticated;

-- Policies for cbcss_records
drop policy if exists "CBCSS records select policy" on public.cbcss_records;
create policy "CBCSS records select policy"
on public.cbcss_records for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_or_leader_for_batch(batch)
);

drop policy if exists "CBCSS records write policy" on public.cbcss_records;
create policy "CBCSS records write policy"
on public.cbcss_records for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_leader_for_batch(batch)
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_leader_for_batch(batch)
);

-- Policies for cbcss_students
drop policy if exists "CBCSS students select policy" on public.cbcss_students;
create policy "CBCSS students select policy"
on public.cbcss_students for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.cbcss_records r
    where r.id = record_id and public.is_class_or_leader_for_batch(r.batch)
  )
);

drop policy if exists "CBCSS students write policy" on public.cbcss_students;
create policy "CBCSS students write policy"
on public.cbcss_students for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.cbcss_records r
    where r.id = record_id and public.is_class_leader_for_batch(r.batch)
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.cbcss_records r
    where r.id = record_id and public.is_class_leader_for_batch(r.batch)
  )
);
