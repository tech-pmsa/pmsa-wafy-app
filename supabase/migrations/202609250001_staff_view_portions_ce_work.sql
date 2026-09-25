-- Allow staff and officer to view portions and CE work across all batches
-- Write permissions remain restricted to class-leader

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

drop policy if exists "Portion calendar all class users read" on public.portion_calendar_exclusions;
create policy "Portion calendar all class users read"
on public.portion_calendar_exclusions for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('class', 'class-leader', 'staff', 'officer')
  )
);
