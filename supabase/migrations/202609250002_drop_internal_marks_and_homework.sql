-- Drop Internal Marks and Homework tables, triggers, and functions

-- Drop Homework tables
drop table if exists public.homework_marks cascade;
drop table if exists public.homework_assignments cascade;
drop table if exists public.homework_subjects cascade;

-- Drop Internal Marks tables
drop table if exists public.internal_reading_marks cascade;
drop table if exists public.internal_writing_marks cascade;
drop table if exists public.internal_newspaper_marks cascade;
drop table if exists public.internal_general_marks cascade;
drop table if exists public.internal_student_skills cascade;
drop table if exists public.internal_morning_talk_attendance cascade;
drop table if exists public.internal_f_talk_marks cascade;

-- Drop associated functions
drop function if exists public.homework_batch_allowed(text);
drop function if exists public.internal_marks_view_allowed(uuid);
drop function if exists public.internal_marks_row_allowed(uuid);
drop function if exists public.internal_marks_student_allowed(uuid);
drop function if exists public.is_internal_marks_class_teacher();
drop function if exists public.profile_batch_number(text);
