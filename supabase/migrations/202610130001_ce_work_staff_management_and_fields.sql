-- Migration: Add fields for CE Work and allow staff/officer to add/edit/delete CE works
alter table public.ce_work_items
  add column if not exists semester text not null default 'SEM-1' check (semester in ('SEM-1', 'SEM-2')),
  add column if not exists teacher_name text,
  add column if not exists mark numeric not null default 0;

create index if not exists ce_work_items_semester_idx on public.ce_work_items(semester);
create index if not exists ce_work_items_batch_semester_idx on public.ce_work_items(batch, semester);

-- Update RLS for ce_work_items to grant full write access to staff and officer
drop policy if exists "CE work class leader write" on public.ce_work_items;
create policy "CE work class leader write"
on public.ce_work_items for all to authenticated
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

-- Update RLS for ce_work_students to grant full write access to staff and officer
drop policy if exists "CE work students class leader write" on public.ce_work_students;
create policy "CE work students class leader write"
on public.ce_work_students for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.ce_work_items w
    where w.id = work_id
      and public.is_class_leader_for_batch(w.batch)
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or exists (
    select 1 from public.ce_work_items w
    where w.id = work_id
      and public.is_class_leader_for_batch(w.batch)
  )
);

-- Optional column for storing device push token in profiles
alter table public.profiles
  add column if not exists expo_push_token text;
