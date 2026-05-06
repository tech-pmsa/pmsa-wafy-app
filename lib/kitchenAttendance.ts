import { supabase } from "@/lib/supabaseClient";

export type KitchenMeal = "day" | "noon" | "night";

export interface KitchenAttendanceStudent {
  id: string;
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
  council: string | null;
  phone: string | null;
  guardian: string | null;
  g_phone: string | null;
  address: string | null;
  img_url: string | null;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function parseDateValue(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getIstTodayDateValue() {
  return formatDateValue(new Date(Date.now() + IST_OFFSET_MS));
}

export function addDaysToDateValue(dateValue: string, days: number) {
  const date = parseDateValue(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateValue(date);
}

export function getKitchenMaxDateValue(todayValue = getIstTodayDateValue()) {
  const date = parseDateValue(todayValue);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return formatDateValue(date);
}

export function isDateValueInKitchenWindow(
  dateValue: string,
  todayValue = getIstTodayDateValue()
) {
  const maxValue = getKitchenMaxDateValue(todayValue);
  return dateValue >= todayValue && dateValue <= maxValue;
}

export function getKitchenDateOptions(todayValue = getIstTodayDateValue()) {
  const maxValue = getKitchenMaxDateValue(todayValue);
  const options: { label: string; value: string }[] = [];
  let current = todayValue;

  while (current <= maxValue) {
    options.push({
      value: current,
      label: formatKitchenDateLabel(current, todayValue),
    });
    current = addDaysToDateValue(current, 1);
  }

  return options;
}

export function formatKitchenDateLabel(
  dateValue: string,
  todayValue = getIstTodayDateValue()
) {
  const date = parseDateValue(dateValue);
  const label = date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  if (dateValue === todayValue) return `Today, ${label}`;
  if (dateValue === addDaysToDateValue(todayValue, 1)) return `Tomorrow, ${label}`;
  return label;
}

export async function cleanupOldKitchenAttendance() {
  await supabase.rpc("cleanup_old_kitchen_attendance");
}

export async function fetchKitchenAttendanceForDate(dateValue: string) {
  await cleanupOldKitchenAttendance();

  const { data, error } = await supabase.rpc("get_kitchen_attendance_for_date", {
    p_attendance_date: dateValue,
  });

  if (error) throw error;
  return (data || []) as KitchenAttendanceStudent[];
}

export async function setKitchenAttendanceRange({
  studentUids,
  fromDate,
  toDate,
  meals,
  present,
}: {
  studentUids: string[];
  fromDate: string;
  toDate: string;
  meals: KitchenMeal[];
  present: boolean;
}) {
  const { error } = await supabase.rpc("set_kitchen_attendance_range", {
    p_student_uids: studentUids,
    p_from_date: fromDate,
    p_to_date: toDate,
    p_meals: meals,
    p_present: present,
  });

  if (error) throw error;
}
