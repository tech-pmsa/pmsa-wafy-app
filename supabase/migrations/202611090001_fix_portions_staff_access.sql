-- Migration: Fix RLS permissions for portion_subjects and portion_week_progress
-- Allows staff and officer to view and manage portions across all classes

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
      and (
        p.role in ('officer', 'staff')
        or (
          p.role in ('class', 'class-leader')
          and (
            p.batch = p_batch
            or p.designation = p_batch
            or replace(coalesce(p.designation, ''), ' Class', '') = p_batch
            or exists (
              select 1
              from public.students s
              where s.batch = p.batch
                and (
                  s.class_id = p_batch
                  or concat(s.class_id, ' Class') = p_batch
                )
            )
          )
        )
      )
  );
$$;

grant execute on function public.is_class_or_leader_for_batch(text) to authenticated;

-- Ensure read access on portion_subjects for staff, officer, and class leaders/teachers
drop policy if exists "Portion subjects class scoped read" on public.portion_subjects;
create policy "Portion subjects class scoped read"
on public.portion_subjects for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_or_leader_for_batch(batch)
);

-- Ensure write access on portion_subjects for staff, officer, class teachers, and class leaders
drop policy if exists "Portion subjects class leader write" on public.portion_subjects;
create policy "Portion subjects class leader write"
on public.portion_subjects for all to authenticated
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

-- Ensure read access on portion_week_progress
drop policy if exists "Portion progress class scoped read" on public.portion_week_progress;
create policy "Portion progress class scoped read"
on public.portion_week_progress for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.portion_subjects s
    where s.id = subject_id
      and public.is_class_or_leader_for_batch(s.batch)
  )
);

-- Ensure write access on portion_week_progress
drop policy if exists "Portion progress class leader write" on public.portion_week_progress;
create policy "Portion progress class leader write"
on public.portion_week_progress for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.portion_subjects s
    where s.id = subject_id
      and public.is_class_leader_for_batch(s.batch)
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.portion_subjects s
    where s.id = subject_id
      and public.is_class_leader_for_batch(s.batch)
  )
);

-- Ensure calendar exclusions read and write permissions include staff and officer
drop policy if exists "Portion calendar all class users read" on public.portion_calendar_exclusions;
create policy "Portion calendar all class users read"
on public.portion_calendar_exclusions for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('class', 'class-leader', 'staff', 'officer')
  )
);

drop policy if exists "Portion calendar class leaders write" on public.portion_calendar_exclusions;
create policy "Portion calendar class leaders write"
on public.portion_calendar_exclusions for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('class', 'class-leader', 'staff', 'officer')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('class', 'class-leader', 'staff', 'officer')
  )
);
