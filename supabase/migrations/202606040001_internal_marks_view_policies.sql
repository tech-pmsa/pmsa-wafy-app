create or replace function public.internal_marks_view_allowed(p_student_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = p_student_uid
    or exists (
      select 1
      from public.profiles p
      where p.uid = auth.uid()
        and p.role in ('officer', 'staff')
    )
    or public.internal_marks_row_allowed(p_student_uid);
$$;

grant execute on function public.internal_marks_view_allowed(uuid) to authenticated;

drop policy if exists "Internal reading viewer access" on public.internal_reading_marks;
create policy "Internal reading viewer access"
on public.internal_reading_marks for select to authenticated
using (public.internal_marks_view_allowed(student_uid));

drop policy if exists "Internal writing viewer access" on public.internal_writing_marks;
create policy "Internal writing viewer access"
on public.internal_writing_marks for select to authenticated
using (public.internal_marks_view_allowed(student_uid));

drop policy if exists "Internal newspaper viewer access" on public.internal_newspaper_marks;
create policy "Internal newspaper viewer access"
on public.internal_newspaper_marks for select to authenticated
using (public.internal_marks_view_allowed(student_uid));

drop policy if exists "Internal general viewer access" on public.internal_general_marks;
create policy "Internal general viewer access"
on public.internal_general_marks for select to authenticated
using (public.internal_marks_view_allowed(student_uid));

drop policy if exists "Internal skills viewer access" on public.internal_student_skills;
create policy "Internal skills viewer access"
on public.internal_student_skills for select to authenticated
using (public.internal_marks_view_allowed(student_uid));

drop policy if exists "Internal morning talk viewer access" on public.internal_morning_talk_attendance;
create policy "Internal morning talk viewer access"
on public.internal_morning_talk_attendance for select to authenticated
using (public.internal_marks_view_allowed(student_uid));

drop policy if exists "Internal F-Talk viewer access" on public.internal_f_talk_marks;
create policy "Internal F-Talk viewer access"
on public.internal_f_talk_marks for select to authenticated
using (public.internal_marks_view_allowed(student_uid));
