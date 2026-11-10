import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert as NativeAlert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  X,
  Plus,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { theme } from "@/theme/theme";
import { supabase } from "@/lib/supabaseClient";
import {
  AcademicRecord,
  AcademicType,
  SubjectItem,
  SemesterData,
  SCHOOL_TYPES,
  STUDY_MODES,
  DIPLOMA_STUDY_MODES,
  BOARDS,
  STREAMS,
  RESULTS,
  DEGREE_STATUSES,
  DEGREE_LEVELS,
  UG_COURSES,
  PG_COURSES,
  INTEGRATED_COURSES,
  SPECIALISATIONS,
  ACADEMIC_SCHEMES,
  TOTAL_SEMESTER_OPTIONS,
} from "@/lib/academicUtils";

interface AcademicFormModalProps {
  visible: boolean;
  academicType: AcademicType;
  record?: AcademicRecord | null;
  student: {
    uid: string;
    name: string;
    cic?: string | null;
    class_id?: string | null;
    batch?: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

export function AcademicFormModal({
  visible,
  academicType,
  record,
  student,
  onClose,
  onSaved,
}: AcademicFormModalProps) {
  const [loading, setLoading] = useState(false);

  // Common / +1 / +2 / Diploma fields
  const [academicYear, setAcademicYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolLocation, setSchoolLocation] = useState("");
  const [schoolType, setSchoolType] = useState<string>("Govt");
  const [studyMode, setStudyMode] = useState<string>("Regular");
  const [board, setBoard] = useState<string>("Kerala State Board");
  const [stream, setStream] = useState<string>("Science");
  const [result, setResult] = useState<string>("passed");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Degree fields
  const [degreeStatus, setDegreeStatus] = useState<string>("Completed");
  const [degreeLevel, setDegreeLevel] = useState<string>("UG");
  const [courseName, setCourseName] = useState<string>("BA");
  const [customCourse, setCustomCourse] = useState("");
  const [courseSpecialisation, setCourseSpecialisation] = useState<string>("English");
  const [customSpecialisation, setCustomSpecialisation] = useState("");
  const [academicScheme, setAcademicScheme] = useState<string>("FYUGP");
  const [university, setUniversity] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [totalSemesters, setTotalSemesters] = useState<number>(6);
  const [semesterData, setSemesterData] = useState<SemesterData[]>([]);

  // Expanded semester index in form
  const [expandedSem, setExpandedSem] = useState<number | null>(1);

  // Reset or Populate form on open
  useEffect(() => {
    if (!visible) return;

    if (record) {
      // Editing existing record
      setAcademicYear(record.academic_year || "");
      setSchoolName(record.school_name || "");
      setSchoolLocation(record.school_location || "");
      setSchoolType(record.school_type || "Govt");
      setStudyMode(record.study_mode || "Regular");
      setBoard(record.board || "Kerala State Board");
      setStream(record.stream || "Science");
      setResult(record.result || "passed");
      setSubjects(record.subjects || []);

      setDegreeStatus(record.degree_status || "Completed");
      setDegreeLevel(record.degree_level || "UG");
      setCourseName(record.course_name || "BA");
      setCourseSpecialisation(record.course_specialisation || "English");
      setAcademicScheme(record.academic_scheme || "FYUGP");
      setUniversity(record.university || "");
      setAdmissionYear(record.admission_year || "");
      setTotalSemesters(record.total_semesters || 6);
      setSemesterData(record.semester_data || []);
    } else {
      // Creating new record
      setAcademicYear("");
      setSchoolName("");
      setSchoolLocation("");
      setSchoolType("Govt");
      setStudyMode("Regular");
      setBoard("Kerala State Board");
      setStream("Science");
      setResult("passed");
      setSubjects([]);

      setDegreeStatus("Completed");
      setDegreeLevel("UG");
      setCourseName("BA");
      setCustomCourse("");
      setCourseSpecialisation("English");
      setCustomSpecialisation("");
      setAcademicScheme("FYUGP");
      setUniversity("");
      setAdmissionYear("");
      setTotalSemesters(6);

      // Initialize semester data for Degree
      const initialSemesters: SemesterData[] = Array.from({ length: 6 }, (_, i) => ({
        semester_no: i + 1,
        cgpa: "",
        subjects: [],
      }));
      setSemesterData(initialSemesters);
      setExpandedSem(1);
    }
  }, [visible, record, academicType]);

  // Adjust semesterData when totalSemesters changes
  const handleTotalSemestersChange = (semCount: number) => {
    setTotalSemesters(semCount);
    setSemesterData((prev) => {
      const updated: SemesterData[] = [];
      for (let i = 1; i <= semCount; i++) {
        const existing = prev.find((s) => s.semester_no === i);
        if (existing) {
          updated.push(existing);
        } else {
          updated.push({ semester_no: i, cgpa: "", subjects: [] });
        }
      }
      return updated;
    });
  };

  // Add / remove subjects for non-degree
  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      { subject_name: "", grade_or_mark: "", status: "passed" },
    ]);
  };

  const updateSubject = (index: number, field: keyof SubjectItem, val: any) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeSubject = (index: number) => {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  };

  // Add / remove subjects for degree semesters
  const addSemesterSubject = (semIndex: number) => {
    setSemesterData((prev) => {
      const next = [...prev];
      const currentSubjects = next[semIndex].subjects || [];
      next[semIndex] = {
        ...next[semIndex],
        subjects: [
          ...currentSubjects,
          { subject_name: "", grade_or_mark: "", status: "passed" },
        ],
      };
      return next;
    });
  };

  const updateSemesterSubject = (
    semIndex: number,
    subIndex: number,
    field: keyof SubjectItem,
    val: any
  ) => {
    setSemesterData((prev) => {
      const next = [...prev];
      const subs = [...next[semIndex].subjects];
      subs[subIndex] = { ...subs[subIndex], [field]: val };
      next[semIndex] = { ...next[semIndex], subjects: subs };
      return next;
    });
  };

  const removeSemesterSubject = (semIndex: number, subIndex: number) => {
    setSemesterData((prev) => {
      const next = [...prev];
      const subs = next[semIndex].subjects.filter((_, i) => i !== subIndex);
      next[semIndex] = { ...next[semIndex], subjects: subs };
      return next;
    });
  };

  const updateSemesterCgpa = (semIndex: number, val: string) => {
    setSemesterData((prev) => {
      const next = [...prev];
      next[semIndex] = { ...next[semIndex], cgpa: val };
      return next;
    });
  };

  // Courses list based on degree level
  const courseOptions =
    degreeLevel === "UG"
      ? UG_COURSES
      : degreeLevel === "PG"
      ? PG_COURSES
      : INTEGRATED_COURSES;

  const currentScheme = ACADEMIC_SCHEMES.find((s) => s.value === academicScheme);

  // Save handler
  const handleSave = async () => {
    if (!student?.uid) {
      NativeAlert.alert("Error", "Student identification is missing.");
      return;
    }

    const isDegree = academicType === "degree";

    if (isDegree) {
      if (!university.trim()) {
        NativeAlert.alert("Required", "Please enter the University name.");
        return;
      }
    } else {
      if (!schoolName.trim()) {
        NativeAlert.alert("Required", "Please enter the School / Institution name.");
        return;
      }
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const finalCourseName =
        courseName === "Other" ? customCourse.trim() : courseName;
      const finalSpecialisation =
        courseSpecialisation === "Other"
          ? customSpecialisation.trim()
          : courseSpecialisation;

      const payload: Partial<AcademicRecord> = {
        student_uid: student.uid,
        student_name: student.name,
        student_cic: student.cic || null,
        class_id: student.class_id || null,
        batch: student.batch || null,
        academic_type: academicType,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),

        // +1 / +2 / Diploma
        academic_year: academicYear.trim(),
        school_name: schoolName.trim(),
        school_location: schoolLocation.trim(),
        school_type: schoolType,
        study_mode: studyMode,
        board: isDegree ? null : board,
        stream: isDegree ? null : stream,
        result: isDegree ? null : result,
        subjects: isDegree ? [] : subjects,

        // Degree
        degree_status: isDegree ? degreeStatus : null,
        degree_level: isDegree ? degreeLevel : null,
        course_name: isDegree ? finalCourseName : courseName.trim(),
        course_specialisation: isDegree ? finalSpecialisation : null,
        academic_scheme: isDegree ? academicScheme : null,
        university: isDegree ? university.trim() : null,
        admission_year: isDegree ? admissionYear.trim() : null,
        total_semesters: isDegree ? totalSemesters : null,
        semester_data: isDegree ? semesterData : [],
      };

      if (record?.id) {
        // Update
        const { error } = await supabase
          .from("student_academics")
          .update(payload)
          .eq("id", record.id);
        if (error) throw error;
        NativeAlert.alert("Success", "Academic record updated successfully!");
      } else {
        // Insert
        const { error } = await supabase.from("student_academics").insert([payload]);
        if (error) throw error;
        NativeAlert.alert("Success", "Academic record added successfully!");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      NativeAlert.alert("Save Failed", err.message || "Failed to save record.");
    } finally {
      setLoading(false);
    }
  };

  const isDegree = academicType === "degree";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {record ? "Edit" : "Add"} {academicType.toUpperCase()} Academic Record
              </Text>
              <Text style={styles.modalSubtitle}>For: {student.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* +1 and +2 and Diploma Form */}
            {!isDegree && (
              <>
                {/* Academic Year */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Academic Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2023–2024, 2024–2025, etc."
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={academicYear}
                    onChangeText={setAcademicYear}
                  />
                </View>

                {/* School Name */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>
                    {academicType === "diploma" ? "Institution / Polytechnic Name" : "School Name"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. KYHSS Athavanad"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={schoolName}
                    onChangeText={setSchoolName}
                  />
                </View>

                {/* School Location */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>School Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Athavanad, Malappuram"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={schoolLocation}
                    onChangeText={setSchoolLocation}
                  />
                </View>

                {/* School Type */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>School Type</Text>
                  <View style={styles.chipRow}>
                    {SCHOOL_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setSchoolType(type)}
                        style={[
                          styles.chip,
                          schoolType === type && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            schoolType === type && styles.chipTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Study Mode */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Study Mode</Text>
                  <View style={styles.chipRow}>
                    {(academicType === "diploma" ? DIPLOMA_STUDY_MODES : STUDY_MODES).map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => setStudyMode(mode)}
                        style={[
                          styles.chip,
                          studyMode === mode && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            studyMode === mode && styles.chipTextActive,
                          ]}
                        >
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Board */}
                {academicType !== "diploma" && (
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Board</Text>
                    <View style={styles.chipRow}>
                      {BOARDS.map((b) => (
                        <TouchableOpacity
                          key={b}
                          onPress={() => setBoard(b)}
                          style={[
                            styles.chip,
                            board === b && styles.chipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              board === b && styles.chipTextActive,
                            ]}
                          >
                            {b}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Stream */}
                {academicType !== "diploma" && (
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Stream</Text>
                    <View style={styles.chipRow}>
                      {STREAMS.map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setStream(s)}
                          style={[
                            styles.chip,
                            stream === s && styles.chipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              stream === s && styles.chipTextActive,
                            ]}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Result */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Result</Text>
                  <View style={styles.chipRow}>
                    {RESULTS.map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setResult(r)}
                        style={[
                          styles.chip,
                          result === r && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            result === r && styles.chipTextActive,
                          ]}
                        >
                          {r.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Subjects Section */}
                <View style={styles.sectionDivider} />
                <View style={styles.subjectHeaderRow}>
                  <Text style={styles.sectionTitle}>Subjects & Marks</Text>
                  <TouchableOpacity
                    onPress={addSubject}
                    style={styles.addSubjectBtn}
                  >
                    <Plus size={14} color={theme.colors.primary} />
                    <Text style={styles.addSubjectBtnText}>Add Subject</Text>
                  </TouchableOpacity>
                </View>

                {subjects.length === 0 ? (
                  <Text style={styles.emptyNote}>
                    {'No subjects added yet. Tap "+ Add Subject" to add marks.'}
                  </Text>
                ) : (
                  subjects.map((sub, idx) => (
                    <View key={idx} style={styles.subjectCard}>
                      <View style={styles.subjectRowInputs}>
                        <View style={{ flex: 1.4 }}>
                          <Text style={styles.subFieldLabel}>Subject Name</Text>
                          <TextInput
                            style={styles.subInput}
                            placeholder="e.g. Physics / English"
                            placeholderTextColor={theme.colors.inputPlaceholder}
                            value={sub.subject_name}
                            onChangeText={(t) =>
                              updateSubject(idx, "subject_name", t)
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subFieldLabel}>Grade / Mark</Text>
                          <TextInput
                            style={styles.subInput}
                            placeholder="e.g. A+ / 95%"
                            placeholderTextColor={theme.colors.inputPlaceholder}
                            value={sub.grade_or_mark}
                            onChangeText={(t) =>
                              updateSubject(idx, "grade_or_mark", t)
                            }
                          />
                        </View>
                        <TouchableOpacity
                          onPress={() => removeSubject(idx)}
                          style={styles.trashBtn}
                        >
                          <Trash2 size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>

                      {/* Status toggle */}
                      <View style={styles.statusToggleRow}>
                        <Text style={styles.subFieldLabel}>Status:</Text>
                        <TouchableOpacity
                          onPress={() => updateSubject(idx, "status", "passed")}
                          style={[
                            styles.subStatusChip,
                            sub.status === "passed" && styles.subStatusPassedActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.subStatusChipText,
                              sub.status === "passed" && styles.subStatusTextActive,
                            ]}
                          >
                            Passed
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => updateSubject(idx, "status", "failed")}
                          style={[
                            styles.subStatusChip,
                            sub.status === "failed" && styles.subStatusFailedActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.subStatusChipText,
                              sub.status === "failed" && styles.subStatusTextActive,
                            ]}
                          >
                            Failed
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {/* Degree Form */}
            {isDegree && (
              <>
                {/* Degree Status */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Degree Status</Text>
                  <View style={styles.chipRow}>
                    {DEGREE_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setDegreeStatus(status)}
                        style={[
                          styles.chip,
                          degreeStatus === status && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            degreeStatus === status && styles.chipTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Degree Level */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Degree Level</Text>
                  <View style={styles.chipRow}>
                    {DEGREE_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level}
                        onPress={() => {
                          setDegreeLevel(level);
                          if (level === "UG") setCourseName("BA");
                          else if (level === "PG") setCourseName("MA");
                          else setCourseName("Integrated MA");
                        }}
                        style={[
                          styles.chip,
                          degreeLevel === level && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            degreeLevel === level && styles.chipTextActive,
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Course Name */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Course</Text>
                  <View style={styles.chipRow}>
                    {courseOptions.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCourseName(c)}
                        style={[
                          styles.chip,
                          courseName === c && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            courseName === c && styles.chipTextActive,
                          ]}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {courseName === "Other" && (
                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      placeholder="Enter custom course name"
                      placeholderTextColor={theme.colors.inputPlaceholder}
                      value={customCourse}
                      onChangeText={setCustomCourse}
                    />
                  )}
                </View>

                {/* Course Specialisation */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Course Specialisation</Text>
                  <View style={styles.chipRow}>
                    {SPECIALISATIONS.map((spec) => (
                      <TouchableOpacity
                        key={spec}
                        onPress={() => setCourseSpecialisation(spec)}
                        style={[
                          styles.chip,
                          courseSpecialisation === spec && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            courseSpecialisation === spec && styles.chipTextActive,
                          ]}
                        >
                          {spec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {courseSpecialisation === "Other" && (
                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      placeholder="Enter custom specialisation"
                      placeholderTextColor={theme.colors.inputPlaceholder}
                      value={customSpecialisation}
                      onChangeText={setCustomSpecialisation}
                    />
                  )}
                </View>

                {/* Academic Scheme */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Academic Scheme</Text>
                  <View style={styles.chipRow}>
                    {ACADEMIC_SCHEMES.map((scheme) => (
                      <TouchableOpacity
                        key={scheme.value}
                        onPress={() => setAcademicScheme(scheme.value)}
                        style={[
                          styles.chip,
                          academicScheme === scheme.value && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            academicScheme === scheme.value && styles.chipTextActive,
                          ]}
                        >
                          {scheme.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Scheme Description Box */}
                  {currentScheme && (
                    <View style={styles.schemeInfoBox}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Info size={15} color={theme.colors.primary} />
                        <Text style={styles.schemeInfoTitle}>{currentScheme.title}</Text>
                      </View>
                      <Text style={styles.schemeInfoText}>{currentScheme.desc}</Text>
                    </View>
                  )}
                </View>

                {/* University */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>University</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Calicut, Kannur, Kerala"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={university}
                    onChangeText={setUniversity}
                  />
                </View>

                {/* Admission Year */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Admission Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2023, 2024, 2025"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={admissionYear}
                    onChangeText={setAdmissionYear}
                  />
                </View>

                {/* Total Semesters */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Total Semester</Text>
                  <View style={styles.chipRow}>
                    {TOTAL_SEMESTER_OPTIONS.map((num) => (
                      <TouchableOpacity
                        key={num}
                        onPress={() => handleTotalSemestersChange(num)}
                        style={[
                          styles.semChip,
                          totalSemesters === num && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            totalSemesters === num && styles.chipTextActive,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Semester-wise Subjects & CGPA */}
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>Semester Marks & CGPA</Text>
                <Text style={styles.sectionDesc}>
                  Enter CGPA/Total mark and subjects for each semester.
                </Text>

                {semesterData.map((sem, sIdx) => {
                  const isExpanded = expandedSem === sem.semester_no;
                  return (
                    <View key={sem.semester_no} style={styles.semAccordion}>
                      <TouchableOpacity
                        onPress={() =>
                          setExpandedSem(isExpanded ? null : sem.semester_no)
                        }
                        style={styles.semAccordionHeader}
                      >
                        <Text style={styles.semAccordionTitle}>
                          Semester {sem.semester_no}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          {sem.cgpa ? (
                            <Text style={styles.semHeaderCgpa}>
                              CGPA: {sem.cgpa}
                            </Text>
                          ) : null}
                          {isExpanded ? (
                            <ChevronUp size={18} color={theme.colors.textMuted} />
                          ) : (
                            <ChevronDown size={18} color={theme.colors.textMuted} />
                          )}
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.semAccordionBody}>
                          {/* CGPA input */}
                          <View style={styles.fieldWrap}>
                            <Text style={styles.subFieldLabel}>
                              Semester CGPA / Total Mark
                            </Text>
                            <TextInput
                              style={styles.input}
                              placeholder="e.g. 8.4 CGPA or 450/500"
                              placeholderTextColor={theme.colors.inputPlaceholder}
                              value={sem.cgpa}
                              onChangeText={(t) => updateSemesterCgpa(sIdx, t)}
                            />
                          </View>

                          {/* Subjects in this Semester */}
                          <View style={styles.subjectHeaderRow}>
                            <Text style={[styles.subFieldLabel, { fontWeight: "700" }]}>
                              Semester {sem.semester_no} Subjects
                            </Text>
                            <TouchableOpacity
                              onPress={() => addSemesterSubject(sIdx)}
                              style={styles.addSubjectBtn}
                            >
                              <Plus size={13} color={theme.colors.primary} />
                              <Text style={styles.addSubjectBtnText}>Add Subject</Text>
                            </TouchableOpacity>
                          </View>

                          {(sem.subjects || []).length === 0 ? (
                            <Text style={styles.emptyNote}>
                              No subjects added for Semester {sem.semester_no}.
                            </Text>
                          ) : (
                            sem.subjects.map((sub, subIdx) => (
                              <View key={subIdx} style={styles.subjectCard}>
                                <View style={styles.subjectRowInputs}>
                                  <View style={{ flex: 1.4 }}>
                                    <Text style={styles.subFieldLabel}>
                                      Subject Name
                                    </Text>
                                    <TextInput
                                      style={styles.subInput}
                                      placeholder="e.g. English I"
                                      placeholderTextColor={
                                        theme.colors.inputPlaceholder
                                      }
                                      value={sub.subject_name}
                                      onChangeText={(t) =>
                                        updateSemesterSubject(
                                          sIdx,
                                          subIdx,
                                          "subject_name",
                                          t
                                        )
                                      }
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.subFieldLabel}>
                                      Mark / Grade
                                    </Text>
                                    <TextInput
                                      style={styles.subInput}
                                      placeholder="e.g. A+ / 90%"
                                      placeholderTextColor={
                                        theme.colors.inputPlaceholder
                                      }
                                      value={sub.grade_or_mark}
                                      onChangeText={(t) =>
                                        updateSemesterSubject(
                                          sIdx,
                                          subIdx,
                                          "grade_or_mark",
                                          t
                                        )
                                      }
                                    />
                                  </View>
                                  <TouchableOpacity
                                    onPress={() =>
                                      removeSemesterSubject(sIdx, subIdx)
                                    }
                                    style={styles.trashBtn}
                                  >
                                    <Trash2
                                      size={16}
                                      color={theme.colors.error}
                                    />
                                  </TouchableOpacity>
                                </View>

                                {/* Status Toggle */}
                                <View style={styles.statusToggleRow}>
                                  <Text style={styles.subFieldLabel}>Status:</Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      updateSemesterSubject(
                                        sIdx,
                                        subIdx,
                                        "status",
                                        "passed"
                                      )
                                    }
                                    style={[
                                      styles.subStatusChip,
                                      sub.status === "passed" &&
                                        styles.subStatusPassedActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.subStatusChipText,
                                        sub.status === "passed" &&
                                          styles.subStatusTextActive,
                                      ]}
                                    >
                                      Passed
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() =>
                                      updateSemesterSubject(
                                        sIdx,
                                        subIdx,
                                        "status",
                                        "failed"
                                      )
                                    }
                                    style={[
                                      styles.subStatusChip,
                                      sub.status === "failed" &&
                                        styles.subStatusFailedActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.subStatusChipText,
                                        sub.status === "failed" &&
                                          styles.subStatusTextActive,
                                      ]}
                                    >
                                      Failed
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveBtn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textOnDark} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {record ? "Update Record" : "Save Record"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 14,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  subFieldLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.textOnDark,
  },
  semChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  schemeInfoBox: {
    backgroundColor: "#F0F7FF",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  schemeInfoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  schemeInfoText: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: -8,
  },
  subjectHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addSubjectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addSubjectBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  emptyNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    paddingVertical: 6,
  },
  subjectCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    marginBottom: 8,
  },
  subjectRowInputs: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  subInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
    color: theme.colors.text,
  },
  trashBtn: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceMuted,
  },
  subStatusPassedActive: {
    backgroundColor: theme.colors.success,
  },
  subStatusFailedActive: {
    backgroundColor: theme.colors.error,
  },
  subStatusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  subStatusTextActive: {
    color: theme.colors.textOnDark,
  },

  semAccordion: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 8,
  },
  semAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
  },
  semAccordionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: theme.colors.text,
  },
  semHeaderCgpa: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  semAccordionBody: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    gap: 10,
  },

  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: theme.colors.textOnDark,
  },
});
