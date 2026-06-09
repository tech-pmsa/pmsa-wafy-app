create or replace function public.profile_batch_number(p_batch text)
returns integer
language sql
immutable
as $$
  select nullif(substring(coalesce(p_batch, '') from 'Batch[[:space:]]+([0-9]+)'), '')::integer;
$$;

create or replace function public.is_internal_marks_class_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where uid = auth.uid()
      and role = 'class'
      and public.profile_batch_number(batch) >= 17
  );
$$;

create table if not exists public.internal_reading_marks (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  entry_date date not null,
  book_name text not null default '',
  author_name text not null default '',
  pages_read integer not null default 0 check (pages_read >= 0),
  language text not null default 'MAL' check (language in ('MAL', 'ENG', 'ARB', 'URD')),
  book_type text not null default 'Novel' check (
    book_type in ('Novel', 'Story', 'Short Story', 'Poem', 'Article', 'Blog', 'Magazine')
  ),
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_uid, entry_date)
);

create table if not exists public.internal_writing_marks (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  entry_date date not null,
  language text not null default 'MAL' check (language in ('MAL', 'ENG', 'ARB', 'URD')),
  writing_type text not null default 'Article' check (
    writing_type in ('Novel', 'Story', 'Short Story', 'Poem', 'Article', 'Blog', 'Magazine')
  ),
  pages_written integer not null default 0 check (pages_written >= 0),
  published_in text not null default 'Not Published' check (
    published_in in (
      'Not Published',
      'Sargambaram',
      'Book',
      'Magazine',
      'Newspaper',
      'Journal',
      'Research',
      'Blog',
      'Website'
    )
  ),
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_uid, entry_date)
);

create table if not exists public.internal_newspaper_marks (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  entry_date date not null,
  language text not null default 'MAL' check (language in ('MAL', 'ENG', 'ARB', 'URD')),
  newspaper_names text[] not null default '{}',
  sections_read text[] not null default '{}',
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_uid, entry_date)
);

create table if not exists public.internal_general_marks (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  entry_date date not null,
  law_practice_status text not null default 'positive' check (law_practice_status in ('positive', 'negative')),
  law_practice_note text not null default '',
  cleaness_status text not null default 'positive' check (cleaness_status in ('positive', 'negative')),
  cleaness_note text not null default '',
  spirituality_status text not null default 'positive' check (spirituality_status in ('positive', 'negative')),
  spirituality_note text not null default '',
  skills_status text not null default 'positive' check (skills_status in ('positive', 'negative')),
  skills_note text not null default '',
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_uid, entry_date)
);

create table if not exists public.internal_morning_talk_attendance (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  entry_date date not null,
  present boolean not null default true,
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_uid, entry_date)
);

create table if not exists public.internal_f_talk_marks (
  id uuid primary key default gen_random_uuid(),
  student_uid uuid not null references public.students(uid) on delete cascade,
  entry_date date not null,
  talked boolean not null default false,
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_uid, entry_date)
);

create index if not exists internal_reading_marks_student_date_idx on public.internal_reading_marks(student_uid, entry_date);
create index if not exists internal_writing_marks_student_date_idx on public.internal_writing_marks(student_uid, entry_date);
create index if not exists internal_newspaper_marks_student_date_idx on public.internal_newspaper_marks(student_uid, entry_date);
create index if not exists internal_general_marks_student_date_idx on public.internal_general_marks(student_uid, entry_date);
create index if not exists internal_morning_talk_attendance_date_idx on public.internal_morning_talk_attendance(entry_date);
create index if not exists internal_f_talk_marks_student_date_idx on public.internal_f_talk_marks(student_uid, entry_date);

drop trigger if exists trg_internal_reading_marks_set_updated_at on public.internal_reading_marks;
create trigger trg_internal_reading_marks_set_updated_at before update on public.internal_reading_marks
for each row execute function public.set_updated_at();

drop trigger if exists trg_internal_writing_marks_set_updated_at on public.internal_writing_marks;
create trigger trg_internal_writing_marks_set_updated_at before update on public.internal_writing_marks
for each row execute function public.set_updated_at();

drop trigger if exists trg_internal_newspaper_marks_set_updated_at on public.internal_newspaper_marks;
create trigger trg_internal_newspaper_marks_set_updated_at before update on public.internal_newspaper_marks
for each row execute function public.set_updated_at();

drop trigger if exists trg_internal_general_marks_set_updated_at on public.internal_general_marks;
create trigger trg_internal_general_marks_set_updated_at before update on public.internal_general_marks
for each row execute function public.set_updated_at();

drop trigger if exists trg_internal_morning_talk_attendance_set_updated_at on public.internal_morning_talk_attendance;
create trigger trg_internal_morning_talk_attendance_set_updated_at before update on public.internal_morning_talk_attendance
for each row execute function public.set_updated_at();

drop trigger if exists trg_internal_f_talk_marks_set_updated_at on public.internal_f_talk_marks;
create trigger trg_internal_f_talk_marks_set_updated_at before update on public.internal_f_talk_marks
for each row execute function public.set_updated_at();

alter table public.internal_reading_marks enable row level security;
alter table public.internal_writing_marks enable row level security;
alter table public.internal_newspaper_marks enable row level security;
alter table public.internal_general_marks enable row level security;
alter table public.internal_morning_talk_attendance enable row level security;
alter table public.internal_f_talk_marks enable row level security;

grant select, insert, update, delete on public.internal_reading_marks to authenticated;
grant select, insert, update, delete on public.internal_writing_marks to authenticated;
grant select, insert, update, delete on public.internal_newspaper_marks to authenticated;
grant select, insert, update, delete on public.internal_general_marks to authenticated;
grant select, insert, update, delete on public.internal_morning_talk_attendance to authenticated;
grant select, insert, update, delete on public.internal_f_talk_marks to authenticated;
grant execute on function public.is_internal_marks_class_teacher() to authenticated;

create or replace function public.internal_marks_row_allowed(p_student_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.students s on s.uid = p_student_uid
    where p.uid = auth.uid()
      and p.role = 'class'
      and public.profile_batch_number(p.batch) >= 17
      and s.batch = p.batch
  );
$$;

grant execute on function public.internal_marks_row_allowed(uuid) to authenticated;

drop policy if exists "Internal reading class teacher access" on public.internal_reading_marks;
create policy "Internal reading class teacher access"
on public.internal_reading_marks for all to authenticated
using (public.internal_marks_row_allowed(student_uid))
with check (public.internal_marks_row_allowed(student_uid));

drop policy if exists "Internal writing class teacher access" on public.internal_writing_marks;
create policy "Internal writing class teacher access"
on public.internal_writing_marks for all to authenticated
using (public.internal_marks_row_allowed(student_uid))
with check (public.internal_marks_row_allowed(student_uid));

drop policy if exists "Internal newspaper class teacher access" on public.internal_newspaper_marks;
create policy "Internal newspaper class teacher access"
on public.internal_newspaper_marks for all to authenticated
using (public.internal_marks_row_allowed(student_uid))
with check (public.internal_marks_row_allowed(student_uid));

drop policy if exists "Internal general class teacher access" on public.internal_general_marks;
create policy "Internal general class teacher access"
on public.internal_general_marks for all to authenticated
using (public.internal_marks_row_allowed(student_uid))
with check (public.internal_marks_row_allowed(student_uid));

drop policy if exists "Internal morning talk class teacher access" on public.internal_morning_talk_attendance;
create policy "Internal morning talk class teacher access"
on public.internal_morning_talk_attendance for all to authenticated
using (public.internal_marks_row_allowed(student_uid))
with check (public.internal_marks_row_allowed(student_uid));

drop policy if exists "Internal f talk class teacher access" on public.internal_f_talk_marks;
create policy "Internal f talk class teacher access"
on public.internal_f_talk_marks for all to authenticated
using (public.internal_marks_row_allowed(student_uid))
with check (public.internal_marks_row_allowed(student_uid));
