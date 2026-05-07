create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where uid = auth.uid()
  limit 1;
$$;

create or replace function public.current_profile_batch()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select batch
  from public.profiles
  where uid = auth.uid()
  limit 1;
$$;

alter table public.kitchen_students enable row level security;
alter table public.kitchen_attendance_overrides enable row level security;

grant select, insert, update, delete on public.kitchen_students to authenticated;
grant select, insert, update, delete on public.kitchen_attendance_overrides to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_batch() to authenticated;

drop policy if exists "Kitchen students admin full access"
  on public.kitchen_students;
drop policy if exists "Kitchen students class scoped read"
  on public.kitchen_students;
drop policy if exists "Kitchen students own student read"
  on public.kitchen_students;

create policy "Kitchen students admin full access"
on public.kitchen_students
for all
to authenticated
using (public.current_profile_role() in ('officer', 'chef', 'main'))
with check (public.current_profile_role() in ('officer', 'chef', 'main'));

create policy "Kitchen students class scoped read"
on public.kitchen_students
for select
to authenticated
using (
  public.current_profile_role() in ('class', 'class-leader', 'staff')
  and batch = public.current_profile_batch()
);

create policy "Kitchen students own student read"
on public.kitchen_students
for select
to authenticated
using (
  public.current_profile_role() = 'student'
  and student_uid = auth.uid()
);

drop policy if exists "Kitchen attendance admin full access"
  on public.kitchen_attendance_overrides;
drop policy if exists "Kitchen attendance class scoped read"
  on public.kitchen_attendance_overrides;
drop policy if exists "Kitchen attendance class scoped insert"
  on public.kitchen_attendance_overrides;
drop policy if exists "Kitchen attendance class scoped update"
  on public.kitchen_attendance_overrides;
drop policy if exists "Kitchen attendance class scoped delete"
  on public.kitchen_attendance_overrides;
drop policy if exists "Kitchen attendance own student read"
  on public.kitchen_attendance_overrides;

create policy "Kitchen attendance admin full access"
on public.kitchen_attendance_overrides
for all
to authenticated
using (public.current_profile_role() in ('officer', 'chef', 'main'))
with check (public.current_profile_role() in ('officer', 'chef', 'main'));

create policy "Kitchen attendance class scoped read"
on public.kitchen_attendance_overrides
for select
to authenticated
using (
  public.current_profile_role() in ('class', 'class-leader', 'staff')
  and exists (
    select 1
    from public.kitchen_students ks
    where ks.student_uid = kitchen_attendance_overrides.student_uid
      and ks.batch = public.current_profile_batch()
  )
);

create policy "Kitchen attendance class scoped insert"
on public.kitchen_attendance_overrides
for insert
to authenticated
with check (
  public.current_profile_role() in ('class', 'class-leader', 'staff')
  and exists (
    select 1
    from public.kitchen_students ks
    where ks.student_uid = kitchen_attendance_overrides.student_uid
      and ks.batch = public.current_profile_batch()
  )
);

create policy "Kitchen attendance class scoped update"
on public.kitchen_attendance_overrides
for update
to authenticated
using (
  public.current_profile_role() in ('class', 'class-leader', 'staff')
  and exists (
    select 1
    from public.kitchen_students ks
    where ks.student_uid = kitchen_attendance_overrides.student_uid
      and ks.batch = public.current_profile_batch()
  )
)
with check (
  public.current_profile_role() in ('class', 'class-leader', 'staff')
  and exists (
    select 1
    from public.kitchen_students ks
    where ks.student_uid = kitchen_attendance_overrides.student_uid
      and ks.batch = public.current_profile_batch()
  )
);

create policy "Kitchen attendance class scoped delete"
on public.kitchen_attendance_overrides
for delete
to authenticated
using (
  public.current_profile_role() in ('class', 'class-leader', 'staff')
  and exists (
    select 1
    from public.kitchen_students ks
    where ks.student_uid = kitchen_attendance_overrides.student_uid
      and ks.batch = public.current_profile_batch()
  )
);

create policy "Kitchen attendance own student read"
on public.kitchen_attendance_overrides
for select
to authenticated
using (
  public.current_profile_role() = 'student'
  and student_uid = auth.uid()
);

create or replace function public.set_kitchen_attendance_range(
  p_student_uids uuid[],
  p_from_date date,
  p_to_date date,
  p_meals text[],
  p_present boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date;
  v_max_date date;
  v_changed integer;
  v_role text;
  v_batch text;
begin
  v_role := public.current_profile_role();
  v_batch := public.current_profile_batch();

  if v_role is null then
    raise exception 'Not authenticated.';
  end if;

  if v_role not in ('officer', 'chef', 'main', 'class', 'class-leader', 'staff') then
    raise exception 'Not allowed to update kitchen attendance.';
  end if;

  if p_student_uids is null or cardinality(p_student_uids) = 0 then
    raise exception 'No students selected for attendance update.';
  end if;

  if v_role in ('class', 'class-leader', 'staff') then
    if v_batch is null or btrim(v_batch) = '' then
      raise exception 'No batch assigned for this profile.';
    end if;

    if exists (
      select 1
      from unnest(p_student_uids) as requested_uid(student_uid)
      left join public.kitchen_students ks
        on ks.student_uid = requested_uid.student_uid
      where ks.student_uid is null
        or ks.batch is distinct from v_batch
    ) then
      raise exception 'You can update kitchen attendance only for your batch.';
    end if;
  end if;

  if p_meals is null or cardinality(p_meals) = 0 then
    raise exception 'No meals selected for attendance update.';
  end if;

  if exists (
    select 1
    from unnest(p_meals) as meal_value
    where meal_value not in ('day', 'noon', 'night')
  ) then
    raise exception 'Invalid meal selected.';
  end if;

  if p_from_date is null or p_to_date is null or p_from_date > p_to_date then
    raise exception 'Invalid date range.';
  end if;

  v_today := public.kitchen_ist_today();
  v_max_date := (v_today + interval '1 month')::date;

  if p_from_date < v_today or p_to_date > v_max_date then
    raise exception 'Kitchen attendance date must be from today through one month ahead.';
  end if;

  perform public.cleanup_old_kitchen_attendance();

  if p_present then
    delete from public.kitchen_attendance_overrides
    where student_uid = any(p_student_uids)
      and attendance_date between p_from_date and p_to_date
      and meal = any(p_meals);

    get diagnostics v_changed = row_count;
    return v_changed;
  end if;

  with rows_to_insert as (
    select
      student_uid_value as student_uid,
      date_value::date as attendance_date,
      meal_value as meal,
      false as present
    from unnest(p_student_uids) as student_uid_value
    cross join generate_series(p_from_date, p_to_date, interval '1 day') as date_value
    cross join unnest(p_meals) as meal_value
  ),
  inserted as (
    insert into public.kitchen_attendance_overrides (
      student_uid,
      attendance_date,
      meal,
      present
    )
    select
      student_uid,
      attendance_date,
      meal,
      present
    from rows_to_insert
    on conflict (student_uid, attendance_date, meal)
    do update set
      present = excluded.present,
      updated_at = now()
    returning 1
  )
  select count(*) into v_changed from inserted;

  return coalesce(v_changed, 0);
end;
$$;

grant execute on function public.kitchen_ist_today() to authenticated;
grant execute on function public.cleanup_old_kitchen_attendance() to authenticated;
grant execute on function public.get_kitchen_attendance_for_date(date) to authenticated;
grant execute on function public.set_kitchen_attendance_range(uuid[], date, date, text[], boolean) to authenticated;
