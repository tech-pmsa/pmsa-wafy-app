export type Semester = "SEM-1" | "SEM-2";

export type WeekBlock = {
  key: string;
  monthKey: string;
  monthLabel: string;
  weekNo: number;
  dateFrom: string;
  dateTo: string;
  workingDates: string[];
};

export const SEMESTER_MONTHS: Record<Semester, { month: number; label: string; half?: "first" | "second" }[]> = {
  "SEM-1": [
    { month: 5, label: "Jun", half: "second" },
    { month: 6, label: "Jul" },
    { month: 7, label: "Aug" },
    { month: 8, label: "Sep" },
    { month: 9, label: "Oct" },
    { month: 10, label: "Nov", half: "first" },
  ],
  "SEM-2": [
    { month: 10, label: "Nov", half: "second" },
    { month: 11, label: "Dec" },
    { month: 0, label: "Jan" },
    { month: 1, label: "Feb" },
    { month: 2, label: "Mar" },
    { month: 3, label: "Apr" },
    { month: 4, label: "May" },
  ],
};

export function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function displayDate(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("T")[0].split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function getAcademicYearBase(today = new Date()) {
  const year = today.getFullYear();
  return today.getMonth() >= 5 ? year : year - 1;
}

export function getSemesterDates(semester: Semester, academicYear = getAcademicYearBase()) {
  const months = SEMESTER_MONTHS[semester];
  const dates: { value: string; label: string; monthKey: string; monthLabel: string }[] = [];

  for (const item of months) {
    const year = item.month >= 5 ? academicYear : academicYear + 1;
    const lastDay = new Date(year, item.month + 1, 0).getDate();
    const startDay = 1;
    const endDay = lastDay;
    const monthKey = `${year}-${String(item.month + 1).padStart(2, "0")}`;

    for (let day = startDay; day <= endDay; day += 1) {
      const date = new Date(year, item.month, day);
      const value = toDateValue(date);
      dates.push({
        value,
        label: String(day),
        monthKey,
        monthLabel: item.label,
      });
    }
  }

  return dates;
}

export function buildWorkingWeeks(
  semester: Semester,
  excludedDates: Set<string>,
  academicYear = getAcademicYearBase()
) {
  const workingDates = getSemesterDates(semester, academicYear).filter(
    (date) => !excludedDates.has(date.value)
  );
  const weeks: WeekBlock[] = [];
  const monthWeekCounts: Record<string, number> = {};

  for (let index = 0; index < workingDates.length; index += 6) {
    const slice = workingDates.slice(index, index + 6);
    if (!slice.length) continue;
    const monthKey = slice[0].monthKey;
    monthWeekCounts[monthKey] = (monthWeekCounts[monthKey] || 0) + 1;
    const weekNo = monthWeekCounts[monthKey];

    weeks.push({
      key: `${monthKey}-W${weekNo}`,
      monthKey,
      monthLabel: slice[0].monthLabel,
      weekNo,
      dateFrom: slice[0].value,
      dateTo: slice[slice.length - 1].value,
      workingDates: slice.map((date) => date.value),
    });
  }

  return weeks;
}

export function getPortionStatus(actual: number, expected: number) {
  if (expected <= 0) return "same";
  const diff = actual - expected;
  if (diff < -0.01) return "back";
  if (diff > 0.01) return "ahead";
  return "same";
}

export function statusLabel(status: string) {
  if (status === "back") return "Behind";
  if (status === "ahead") return "Ahead";
  return "Same";
}

export function n(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
