import { supabase } from "@/lib/supabaseClient";

export type AcademicType = "+1" | "+2" | "degree" | "diploma";

export type SubjectItem = {
  subject_name: string;
  grade_or_mark: string;
  status: "passed" | "failed";
};

export type SemesterData = {
  semester_no: number;
  cgpa: string;
  subjects: SubjectItem[];
};

export type AcademicRecord = {
  id?: string;
  student_uid: string;
  student_name: string;
  student_cic?: string | null;
  class_id?: string | null;
  batch?: string | null;
  academic_type: AcademicType;

  // +1, +2 & general fields
  academic_year?: string;
  school_name?: string;
  school_location?: string;
  school_type?: string;
  study_mode?: string;
  board?: string;
  stream?: string;
  result?: string;
  subjects?: SubjectItem[];

  // Degree fields
  degree_status?: string;
  degree_level?: string;
  course_name?: string;
  course_specialisation?: string;
  academic_scheme?: string;
  university?: string;
  admission_year?: string;
  total_semesters?: number;
  semester_data?: SemesterData[];

  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const ACADEMIC_TABS: { key: AcademicType; label: string; badgeLabel: string }[] = [
  { key: "+1", label: "+1 (Plus One)", badgeLabel: "+1 Higher Secondary" },
  { key: "+2", label: "+2 (Plus Two)", badgeLabel: "+2 Higher Secondary" },
  { key: "degree", label: "Degree", badgeLabel: "Degree / Graduation" },
  { key: "diploma", label: "Diploma", badgeLabel: "Diploma Course" },
];

export const SCHOOL_TYPES = ["Govt", "Govt Aided", "Private", "Other"] as const;
export const STUDY_MODES = ["Regular", "Open School", "Private", "Distance Education"] as const;
export const DIPLOMA_STUDY_MODES = ["Regular", "Part Time", "Distance Education", "Online"] as const;
export const BOARDS = ["Kerala State Board", "CBSE", "ICSE", "NIOS", "Other"] as const;
export const STREAMS = ["Science", "Commerce", "Humanities", "Other"] as const;
export const RESULTS = ["passed", "failed", "appearing"] as const;

export const DEGREE_STATUSES = [
  "Completed",
  "Studying",
  "Result Awaited",
  "Arrear/Backlog",
  "Discontinued",
] as const;

export const DEGREE_LEVELS = ["UG", "PG", "Integrated Degree"] as const;

export const UG_COURSES = ["BA", "BSc", "BCom", "BBA", "BCA", "BSW", "BVoc", "Other"] as const;
export const PG_COURSES = ["MA", "MSc", "MCom", "MBA", "MCA", "MSW", "MVoc", "Other"] as const;
export const INTEGRATED_COURSES = ["Integrated MA", "Integrated MSc", "Integrated BS-MS", "Other"] as const;

export const SPECIALISATIONS = [
  "English",
  "Arabic",
  "Politics",
  "Sociology",
  "Economics",
  "Computer Science",
  "Other",
] as const;

export const ACADEMIC_SCHEMES = [
  {
    value: "FYUGP",
    title: "FYUGP (Four Year Undergraduate Programme)",
    desc: "Curriculum with Major, Minor, Multi-disciplinary pathways and multiple exit/entry options under NEP.",
  },
  {
    value: "CBCSS",
    title: "CBCSS (Choice Based Credit Semester System)",
    desc: "Traditional 3-year semester credit-based system followed in State Universities.",
  },
  {
    value: "Other",
    title: "Other / Autonomous",
    desc: "Autonomous, Annual Scheme, or Non-CBCSS syllabus pattern.",
  },
] as const;

export const TOTAL_SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function isFoundationUser(details: any): boolean {
  if (!details) return false;
  const str = `${details.class_id || ""} ${details.batch || ""} ${details.designation || ""}`.toLowerCase();
  return str.includes("foundation");
}

export function isFoundationClass(name?: string | null): boolean {
  if (!name) return false;
  return /foundation/i.test(name.trim());
}

export type ClassOption = {
  id: string;
  label: string;
  queryKeys: string[];
};

export async function fetchNonFoundationClasses(): Promise<ClassOption[]> {
  try {
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("class_id, batch");

    if (studentsError) throw studentsError;

    const classMap: Record<string, Set<string>> = {};

    (students || []).forEach((s: any) => {
      const classId = s.class_id?.trim();
      const batch = s.batch?.trim();
      if (!classId && !batch) return;

      const primaryKey = classId || batch;
      if (isFoundationClass(primaryKey)) return;

      if (!classMap[primaryKey]) {
        classMap[primaryKey] = new Set<string>();
      }
      if (classId && !isFoundationClass(classId)) {
        classMap[primaryKey].add(classId);
        classMap[primaryKey].add(`${classId} Class`);
      }
      if (batch && !isFoundationClass(batch)) {
        classMap[primaryKey].add(batch);
        classMap[primaryKey].add(`${batch} Class`);
      }
    });

    const options: ClassOption[] = Object.keys(classMap)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
      .map((key) => ({
        id: key,
        label: key,
        queryKeys: Array.from(classMap[key]),
      }));

    return options;
  } catch (err) {
    console.error("Failed to fetch non-foundation class options:", err);
    return [];
  }
}
