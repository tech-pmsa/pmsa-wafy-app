create table if not exists public.old_students (
  id uuid primary key default gen_random_uuid(),
  original_student_uid uuid not null,
  archive_class_id text not null,
  original_class_id text,
  name text not null,
  cic text,
  council text,
  batch text,
  phone text,
  guardian text,
  g_phone text,
  address text,
  sslc text,
  plustwo text,
  plustwo_streams text,
  dob date,
  img_url text,
  student_data jsonb not null default '{}'::jsonb,
  family_data jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now(),
  archived_by uuid references public.profiles(uid) on delete set null,
  unique (original_student_uid)
);

create index if not exists old_students_archive_class_id_idx
on public.old_students(archive_class_id);

create index if not exists old_students_name_idx
on public.old_students(name);

create index if not exists old_students_cic_idx
on public.old_students(cic);

alter table public.old_students enable row level security;

grant select, insert, update, delete on public.old_students to authenticated;

drop policy if exists "Old students officer access" on public.old_students;
create policy "Old students officer access"
on public.old_students for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.uid = auth.uid()
      and p.role = 'officer'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.uid = auth.uid()
      and p.role = 'officer'
  )
);
