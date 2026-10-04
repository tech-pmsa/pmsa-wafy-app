-- Allow both class teachers ('class') and class leaders ('class-leader') to add, edit, and update portions

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
      and p.role in ('class-leader', 'class')
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
  );
$$;

grant execute on function public.is_class_leader_for_batch(text) to authenticated;

drop policy if exists "Portion calendar class leaders write" on public.portion_calendar_exclusions;
create policy "Portion calendar class leaders write"
on public.portion_calendar_exclusions for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('class-leader', 'class')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('class-leader', 'class')
  )
);
