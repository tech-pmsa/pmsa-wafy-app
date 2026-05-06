create table if not exists public.kitchen_attendance_overrides (
  id uuid not null default gen_random_uuid(),
  student_uid uuid not null,
  attendance_date date not null,
  meal text not null,
  present boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint kitchen_attendance_overrides_pkey primary key (id),
  constraint kitchen_attendance_overrides_student_uid_date_meal_key unique (
    student_uid,
    attendance_date,
    meal
  ),
  constraint kitchen_attendance_overrides_student_uid_fkey foreign key (student_uid)
    references public.students (uid)
    on delete cascade,
  constraint kitchen_attendance_overrides_meal_check check (
    meal in ('day', 'noon', 'night')
  )
);

create index if not exists kitchen_attendance_overrides_date_idx
  on public.kitchen_attendance_overrides using btree (attendance_date);

create index if not exists kitchen_attendance_overrides_student_uid_idx
  on public.kitchen_attendance_overrides using btree (student_uid);

create index if not exists kitchen_attendance_overrides_meal_idx
  on public.kitchen_attendance_overrides using btree (meal);

drop trigger if exists trg_kitchen_attendance_overrides_set_updated_at
  on public.kitchen_attendance_overrides;

create trigger trg_kitchen_attendance_overrides_set_updated_at
  before update on public.kitchen_attendance_overrides
  for each row
  execute function public.set_updated_at();

create or replace function public.kitchen_ist_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

create or replace function public.cleanup_old_kitchen_attendance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_start date;
  v_deleted integer;
begin
  v_week_start := date_trunc(
    'week',
    now() at time zone 'Asia/Kolkata'
  )::date;

  delete from public.kitchen_attendance_overrides
  where attendance_date < v_week_start;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.get_kitchen_attendance_for_date(
  p_attendance_date date
)
returns table (
  id uuid,
  student_uid uuid,
  name text,
  cic text,
  class_id text,
  batch text,
  council text,
  phone text,
  guardian text,
  g_phone text,
  address text,
  img_url text,
  day_present boolean,
  noon_present boolean,
  night_present boolean
)
language sql
stable
set search_path = public
as $$
  select
    ks.id,
    ks.student_uid,
    ks.name,
    ks.cic,
    ks.class_id,
    ks.batch,
    ks.council,
    ks.phone,
    ks.guardian,
    ks.g_phone,
    ks.address,
    ks.img_url,
    coalesce(day_override.present, true) as day_present,
    coalesce(noon_override.present, true) as noon_present,
    coalesce(night_override.present, true) as night_present
  from public.kitchen_students ks
  left join public.kitchen_attendance_overrides day_override
    on day_override.student_uid = ks.student_uid
    and day_override.attendance_date = p_attendance_date
    and day_override.meal = 'day'
  left join public.kitchen_attendance_overrides noon_override
    on noon_override.student_uid = ks.student_uid
    and noon_override.attendance_date = p_attendance_date
    and noon_override.meal = 'noon'
  left join public.kitchen_attendance_overrides night_override
    on night_override.student_uid = ks.student_uid
    and night_override.attendance_date = p_attendance_date
    and night_override.meal = 'night'
  order by ks.name asc;
$$;

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
begin
  if p_student_uids is null or cardinality(p_student_uids) = 0 then
    raise exception 'No students selected for attendance update.';
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

insert into public.kitchen_attendance_overrides (
  student_uid,
  attendance_date,
  meal,
  present
)
select
  ks.student_uid,
  public.kitchen_ist_today(),
  meal_status.meal,
  false
from public.kitchen_students ks
cross join lateral (
  values
    ('day', ks.day_present),
    ('noon', ks.noon_present),
    ('night', ks.night_present)
) as meal_status(meal, is_present)
where meal_status.is_present = false
on conflict (student_uid, attendance_date, meal)
do update set
  present = excluded.present,
  updated_at = now();
