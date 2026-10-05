-- Update is_class_or_leader_for_batch to align with is_class_leader_for_batch
-- Supporting designations ending in ' Class' and student table lookups

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

grant execute on function public.is_class_or_leader_for_batch(text) to authenticated;
