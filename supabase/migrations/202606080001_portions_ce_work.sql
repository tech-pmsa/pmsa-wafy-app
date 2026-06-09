create table if not exists public.portion_calendar_exclusions (
  id uuid primary key default gen_random_uuid(),
  semester text not null check (semester in ('SEM-1', 'SEM-2')),
  excluded_date date not null,
  reason text,
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  unique (semester, excluded_date)
);

create table if not exists public.portion_subjects (
  id uuid primary key default gen_random_uuid(),
  batch text not null,
  semester text not null check (semester in ('SEM-1', 'SEM-2')),
  subject_name text not null,
  teacher_name text not null,
  total_pages numeric not null default 0 check (total_pages >= 0),
  total_period numeric not null default 0 check (total_period >= 0),
  period_per_week numeric not null default 0 check (period_per_week >= 0),
  pages_per_day numeric not null default 0 check (pages_per_day >= 0),
  pages_per_week numeric not null default 0 check (pages_per_week >= 0),
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portion_week_progress (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.portion_subjects(id) on delete cascade,
  week_key text not null,
  month_key text not null,
  week_no integer not null,
  date_from date not null,
  date_to date not null,
  period_taken numeric not null default 0 check (period_taken >= 0),
  pages_taken numeric not null default 0 check (pages_taken >= 0),
  updated_by uuid references public.profiles(uid) on delete set null,
  updated_at timestamptz not null default now(),
  unique (subject_id, week_key)
);

create table if not exists public.ce_work_items (
  id uuid primary key default gen_random_uuid(),
  batch text not null,
  work_name text not null,
  subject_name text not null,
  started_date date not null,
  submission_date date not null,
  created_by uuid references public.profiles(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_work_students (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.ce_work_items(id) on delete cascade,
  student_uid uuid not null references public.students(uid) on delete cascade,
  student_name text not null,
  cic text,
  is_submitted boolean not null default false,
  is_removed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (work_id, student_uid)
);

create index if not exists portion_calendar_exclusions_semester_idx on public.portion_calendar_exclusions(semester);
create index if not exists portion_subjects_batch_semester_idx on public.portion_subjects(batch, semester);
create index if not exists portion_week_progress_subject_idx on public.portion_week_progress(subject_id);
create index if not exists ce_work_items_batch_idx on public.ce_work_items(batch);
create index if not exists ce_work_students_work_idx on public.ce_work_students(work_id);

drop trigger if exists trg_portion_subjects_set_updated_at on public.portion_subjects;
create trigger trg_portion_subjects_set_updated_at before update on public.portion_subjects
for each row execute function public.set_updated_at();

drop trigger if exists trg_ce_work_items_set_updated_at on public.ce_work_items;
create trigger trg_ce_work_items_set_updated_at before update on public.ce_work_items
for each row execute function public.set_updated_at();

alter table public.portion_calendar_exclusions enable row level security;
alter table public.portion_subjects enable row level security;
alter table public.portion_week_progress enable row level security;
alter table public.ce_work_items enable row level security;
alter table public.ce_work_students enable row level security;

grant select, insert, update, delete on public.portion_calendar_exclusions to authenticated;
grant select, insert, update, delete on public.portion_subjects to authenticated;
grant select, insert, update, delete on public.portion_week_progress to authenticated;
grant select, insert, update, delete on public.ce_work_items to authenticated;
grant select, insert, update, delete on public.ce_work_students to authenticated;

create or replace function public.is_class_or_leader_for_batch(p_batch text)
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
      and p.role in ('class', 'class-leader')
      and (p.batch = p_batch or p.designation = p_batch)
  );
$$;

create or replace function public.is_class_leader_for_batch(p_batch text)
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
      and p.role = 'class-leader'
      and (p.batch = p_batch or p.designation = p_batch)
  );
$$;

grant execute on function public.is_class_or_leader_for_batch(text) to authenticated;
grant execute on function public.is_class_leader_for_batch(text) to authenticated;

drop policy if exists "Portion calendar all class users read" on public.portion_calendar_exclusions;
create policy "Portion calendar all class users read"
on public.portion_calendar_exclusions for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('class', 'class-leader')
  )
);

drop policy if exists "Portion calendar class leaders write" on public.portion_calendar_exclusions;
create policy "Portion calendar class leaders write"
on public.portion_calendar_exclusions for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role = 'class-leader'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role = 'class-leader'
  )
);

drop policy if exists "Portion subjects class scoped read" on public.portion_subjects;
create policy "Portion subjects class scoped read"
on public.portion_subjects for select to authenticated
using (public.is_class_or_leader_for_batch(batch));

drop policy if exists "Portion subjects class leader write" on public.portion_subjects;
create policy "Portion subjects class leader write"
on public.portion_subjects for all to authenticated
using (public.is_class_leader_for_batch(batch))
with check (public.is_class_leader_for_batch(batch));

drop policy if exists "Portion progress class scoped read" on public.portion_week_progress;
create policy "Portion progress class scoped read"
on public.portion_week_progress for select to authenticated
using (
  exists (
    select 1 from public.portion_subjects s
    where s.id = subject_id
      and public.is_class_or_leader_for_batch(s.batch)
  )
);

drop policy if exists "Portion progress class leader write" on public.portion_week_progress;
create policy "Portion progress class leader write"
on public.portion_week_progress for all to authenticated
using (
  exists (
    select 1 from public.portion_subjects s
    where s.id = subject_id
      and public.is_class_leader_for_batch(s.batch)
  )
)
with check (
  exists (
    select 1 from public.portion_subjects s
    where s.id = subject_id
      and public.is_class_leader_for_batch(s.batch)
  )
);

drop policy if exists "CE work class scoped read" on public.ce_work_items;
create policy "CE work class scoped read"
on public.ce_work_items for select to authenticated
using (public.is_class_or_leader_for_batch(batch));

drop policy if exists "CE work class leader write" on public.ce_work_items;
create policy "CE work class leader write"
on public.ce_work_items for all to authenticated
using (public.is_class_leader_for_batch(batch))
with check (public.is_class_leader_for_batch(batch));

drop policy if exists "CE work students class scoped read" on public.ce_work_students;
create policy "CE work students class scoped read"
on public.ce_work_students for select to authenticated
using (
  exists (
    select 1 from public.ce_work_items w
    where w.id = work_id
      and public.is_class_or_leader_for_batch(w.batch)
  )
);

drop policy if exists "CE work students class leader write" on public.ce_work_students;
create policy "CE work students class leader write"
on public.ce_work_students for all to authenticated
using (
  exists (
    select 1 from public.ce_work_items w
    where w.id = work_id
      and public.is_class_leader_for_batch(w.batch)
  )
)
with check (
  exists (
    select 1 from public.ce_work_items w
    where w.id = work_id
      and public.is_class_leader_for_batch(w.batch)
  )
);
