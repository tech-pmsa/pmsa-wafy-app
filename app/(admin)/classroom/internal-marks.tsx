import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { utils, write } from "xlsx";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  FileDown,
  FileText,
  Mic2,
  Newspaper,
  PenLine,
  Save,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react-native";

type TabKey = "reading" | "writing" | "newspaper" | "general" | "morning" | "fTalk";
type Tone = "positive" | "negative";

interface StudentOption {
  uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
}

const LANGUAGE_OPTIONS = ["MAL", "ENG", "ARB", "URD"].map((value) => ({
  label: value,
  value,
}));

const BOOK_TYPE_OPTIONS = [
  "Novel",
  "Story",
  "Short Story",
  "Poem",
  "Article",
  "Blog",
  "Magazine",
].map((value) => ({ label: value, value }));

const PUBLISHED_OPTIONS = [
  "Not Published",
  "Sargambaram",
  "Book",
  "Magazine",
  "Newspaper",
  "Journal",
  "Research",
  "Blog",
  "Website",
].map((value) => ({ label: value, value }));

const NEWSPAPERS: Record<string, string[]> = {
  MAL: ["Malayala Manorama", "Suprabhatam", "Chandrika", "Madhyamam"],
  ENG: ["The Hindu"],
  ARB: ["A Arabic Newspaper"],
  URD: ["A Urdu Newspaper"],
};

const NEWSPAPER_SECTIONS = [
  "Front Page",
  "Politics",
  "International",
  "Sports",
  "Editorial",
  "Religion",
  "Education",
  "Lifestyle",
  "Business",
];

const GENERAL_FIELDS: {
  key: "law_practice" | "cleaness" | "spirituality";
  label: string;
}[] = [
  { key: "law_practice", label: "Law practice" },
  { key: "cleaness", label: "Cleaness" },
  { key: "spirituality", label: "Spirituality" },
];

const MARK_OPTIONS = Array.from({ length: 11 }, (_, value) => ({
  label: `${value}/10`,
  value: String(value),
}));

function getBatchNumber(batch?: string | null) {
  const match = batch?.match(/Batch\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function isEligibleBatch(batch?: string | null) {
  const batchNumber = getBatchNumber(batch);
  return !!batchNumber && batchNumber >= 17;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDateValue() {
  return toDateValue(new Date());
}

function formatDateDisplay(dateValue: string) {
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
}

function dateValueToDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function sortByCic(a: StudentOption, b: StudentOption) {
  return (a.cic || "").localeCompare(b.cic || "", undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function safeSheetName(name: string, fallback: string, used: Set<string>) {
  const base = (name || fallback)
    .replace(/[\[\]\*\/\\\?:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28) || fallback;

  let candidate = base;
  let index = 1;

  while (used.has(candidate)) {
    const suffix = ` ${index}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }

  used.add(candidate);
  return candidate;
}

function commaList(value?: string[] | null) {
  return value?.length ? value.join(", ") : "";
}

function addSection(rows: any[][], title: string, headers: string[], dataRows: any[][]) {
  rows.push([]);
  rows.push([title]);
  rows.push(headers);
  if (dataRows.length === 0) {
    rows.push(["No data"]);
    return;
  }
  rows.push(...dataRows);
}

function topFive(
  students: StudentOption[],
  getValue: (student: StudentOption) => number
) {
  return [...students]
    .map((student) => ({ student, value: getValue(student) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value || sortByCic(a.student, b.student))
    .slice(0, 5);
}

function SearchableStudentPicker({
  value,
  students,
  onSelect,
}: {
  value: string;
  students: StudentOption[];
  onSelect: (studentUid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = students.find((student) => student.uid === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(q) ||
        student.cic?.toLowerCase().includes(q) ||
        student.class_id.toLowerCase().includes(q)
    );
  }, [students, query]);

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        activeOpacity={0.84}
        onPress={() => setOpen(true)}
      >
        <UserRound size={17} color={theme.colors.textMuted} />
        <Text
          style={selected ? styles.pickerButtonText : styles.pickerPlaceholder}
          numberOfLines={1}
        >
          {selected ? `${selected.name} (${selected.cic || "No CIC"})` : "Select student"}
        </Text>
        <ChevronDown size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Student</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search name, CIC, class..."
                placeholderTextColor={theme.colors.textMuted}
                style={styles.searchInput}
                autoFocus
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.uid}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.studentOption}
                  onPress={() => {
                    onSelect(item.uid);
                    setOpen(false);
                    setQuery("");
                  }}
                  activeOpacity={0.84}
                >
                  <Text style={styles.studentOptionName}>{item.name}</Text>
                  <Text style={styles.studentOptionMeta}>
                    CIC: {item.cic || "-"} | {item.class_id}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.emptyText}>No students found.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function CustomPicker({
  value,
  options,
  onSelect,
  placeholder,
}: {
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setOpen(true)} activeOpacity={0.84}>
        <Text style={selected ? styles.pickerButtonText : styles.pickerPlaceholder} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <ChevronDown size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  activeOpacity={0.84}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, item.value === value && styles.pickerItemTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function DateSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <View>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setShow(true)} activeOpacity={0.84}>
        <CalendarDays size={17} color={theme.colors.textMuted} />
        <Text style={styles.pickerButtonText}>{formatDateDisplay(value)}</Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={dateValueToDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedDate) => {
            setShow(Platform.OS === "ios");
            if (!selectedDate) return;
            onChange(toDateValue(selectedDate));
          }}
        />
      )}
    </View>
  );
}

function MultiChoice({
  values,
  options,
  onChange,
}: {
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(
      values.includes(option)
        ? values.filter((value) => value !== option)
        : [...values, option]
    );
  };

  return (
    <View style={styles.choiceGrid}>
      {options.map((option) => {
        const active = values.includes(option);
        return (
          <TouchableOpacity
            key={option}
            onPress={() => toggle(option)}
            style={[styles.choiceChip, active && styles.choiceChipActive]}
            activeOpacity={0.84}
          >
            {active ? <Check size={14} color={theme.colors.textOnDark} /> : null}
            <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function InlineSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.inlineSearchBox}>
      <Search size={18} color={theme.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search student..."
        placeholderTextColor={theme.colors.textMuted}
        style={styles.inlineSearchInput}
      />
    </View>
  );
}

function MarkPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.markWrap}>
      <Text style={styles.markLabel}>Mark</Text>
      <CustomPicker
        value={String(value)}
        options={MARK_OPTIONS}
        placeholder="Mark"
        onSelect={(next) => onChange(Number(next))}
      />
    </View>
  );
}

function ToneInput({
  label,
  tone,
  text,
  onToneChange,
  onTextChange,
}: {
  label: string;
  tone: Tone;
  text: string;
  onToneChange: (tone: Tone) => void;
  onTextChange: (text: string) => void;
}) {
  return (
    <View style={styles.toneCard}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.toneRow}>
        <TouchableOpacity
          style={[styles.toneButton, styles.tonePositive, tone === "positive" && styles.toneButtonActive]}
          onPress={() => onToneChange("positive")}
        >
          <Text style={[styles.toneButtonText, tone === "positive" && styles.toneButtonTextActive]}>
            Positive
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toneButton, styles.toneNegative, tone === "negative" && styles.toneButtonActive]}
          onPress={() => onToneChange("negative")}
        >
          <Text style={[styles.toneButtonText, tone === "negative" && styles.toneButtonTextActive]}>
            Negative
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={text}
        onChangeText={onTextChange}
        placeholder={`Write ${label.toLowerCase()} note...`}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.textArea}
        multiline
      />
    </View>
  );
}

export default function InternalMarksPage() {
  const { role, details, loading: userLoading } = useUserData();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("reading");
  const [selectedStudentUid, setSelectedStudentUid] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayDateValue());
  const [morningDate, setMorningDate] = useState(todayDateValue());
  const [fTalkDate, setFTalkDate] = useState(todayDateValue());
  const [morningSearch, setMorningSearch] = useState("");
  const [fTalkSearch, setFTalkSearch] = useState("");
  const [morningMap, setMorningMap] = useState<
    Record<string, { present: boolean; mark: number }>
  >({});
  const [fTalkMap, setFTalkMap] = useState<
    Record<string, { talked: boolean; mark: number }>
  >({});
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<{ id: string; skill_name: string }[]>([]);

  const [reading, setReading] = useState({
    book_name: "",
    author_name: "",
    pages_read: "",
    language: "MAL",
    book_type: "Novel",
  });
  const [writing, setWriting] = useState({
    language: "MAL",
    writing_type: "Article",
    pages_written: "",
    published_in: "Not Published",
  });
  const [newspaper, setNewspaper] = useState({
    language: "MAL",
    newspaper_names: [] as string[],
    sections_read: [] as string[],
  });
  const [general, setGeneral] = useState({
    law_practice_status: "positive" as Tone,
    law_practice_note: "",
    cleaness_status: "positive" as Tone,
    cleaness_note: "",
    spirituality_status: "positive" as Tone,
    spirituality_note: "",
  });

  const eligible = role === "class" && isEligibleBatch(details?.batch);

  const fetchStudents = useCallback(async () => {
    if (!details?.batch || !eligible) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("uid, name, cic, class_id, batch")
        .eq("batch", details.batch)
        .order("cic", { ascending: true });

      if (error) throw error;
      const rows = ((data || []) as StudentOption[]).sort(sortByCic);
      setStudents(rows);
      if (!selectedStudentUid && rows[0]) setSelectedStudentUid(rows[0].uid);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [details?.batch, eligible, selectedStudentUid]);

  useEffect(() => {
    if (!userLoading) fetchStudents();
  }, [userLoading, fetchStudents]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.uid === selectedStudentUid) || null,
    [students, selectedStudentUid]
  );

  const loadSingleRecord = useCallback(async () => {
    if (!selectedStudentUid || !selectedDate) return;

    try {
      if (activeTab === "reading") {
        const { data } = await supabase
          .from("internal_reading_marks")
          .select("*")
          .eq("student_uid", selectedStudentUid)
          .eq("entry_date", selectedDate)
          .maybeSingle();
        setReading({
          book_name: data?.book_name || "",
          author_name: data?.author_name || "",
          pages_read: data?.pages_read ? String(data.pages_read) : "",
          language: data?.language || "MAL",
          book_type: data?.book_type || "Novel",
        });
      }

      if (activeTab === "writing") {
        const { data } = await supabase
          .from("internal_writing_marks")
          .select("*")
          .eq("student_uid", selectedStudentUid)
          .eq("entry_date", selectedDate)
          .maybeSingle();
        setWriting({
          language: data?.language || "MAL",
          writing_type: data?.writing_type || "Article",
          pages_written: data?.pages_written ? String(data.pages_written) : "",
          published_in: data?.published_in || "Not Published",
        });
      }

      if (activeTab === "newspaper") {
        const { data } = await supabase
          .from("internal_newspaper_marks")
          .select("*")
          .eq("student_uid", selectedStudentUid)
          .eq("entry_date", selectedDate)
          .maybeSingle();
        setNewspaper({
          language: data?.language || "MAL",
          newspaper_names: data?.newspaper_names || [],
          sections_read: data?.sections_read || [],
        });
      }

      if (activeTab === "general") {
        const { data } = await supabase
          .from("internal_general_marks")
          .select("*")
          .eq("student_uid", selectedStudentUid)
          .eq("entry_date", selectedDate)
          .maybeSingle();
        setGeneral({
          law_practice_status: data?.law_practice_status || "positive",
          law_practice_note: data?.law_practice_note || "",
          cleaness_status: data?.cleaness_status || "positive",
          cleaness_note: data?.cleaness_note || "",
          spirituality_status: data?.spirituality_status || "positive",
          spirituality_note: data?.spirituality_note || "",
        });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load saved data.");
    }
  }, [activeTab, selectedStudentUid, selectedDate]);

  useEffect(() => {
    loadSingleRecord();
  }, [loadSingleRecord]);

  const loadSkills = useCallback(async () => {
    if (!selectedStudentUid) {
      setSkills([]);
      return;
    }

    const { data, error } = await supabase
      .from("internal_student_skills")
      .select("id, skill_name")
      .eq("student_uid", selectedStudentUid)
      .order("skill_name", { ascending: true });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setSkills((data || []) as { id: string; skill_name: string }[]);
  }, [selectedStudentUid]);

  useEffect(() => {
    if (activeTab === "general") loadSkills();
  }, [activeTab, loadSkills]);

  const loadMorningTalk = useCallback(async () => {
    if (students.length === 0) return;
    const { data, error } = await supabase
      .from("internal_morning_talk_attendance")
      .select("student_uid, present, mark")
      .eq("entry_date", morningDate);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    const next: Record<string, { present: boolean; mark: number }> = {};
    students.forEach((student) => {
      next[student.uid] = { present: false, mark: 0 };
    });
    (data || []).forEach((row: any) => {
      next[row.student_uid] = {
        present: row.present,
        mark: row.mark ?? 0,
      };
    });
    setMorningMap(next);
  }, [students, morningDate]);

  useEffect(() => {
    if (activeTab === "morning") loadMorningTalk();
  }, [activeTab, loadMorningTalk]);

  const loadFTalk = useCallback(async () => {
    if (students.length === 0 || activeTab !== "fTalk") return;
    const { data, error } = await supabase
      .from("internal_f_talk_marks")
      .select("student_uid, talked, mark")
      .eq("entry_date", fTalkDate);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    const next: Record<string, { talked: boolean; mark: number }> = {};
    students.forEach((student) => {
      next[student.uid] = { talked: false, mark: 0 };
    });
    (data || []).forEach((row: any) => {
      next[row.student_uid] = {
        talked: row.talked || false,
        mark: row.mark ?? 0,
      };
    });
    setFTalkMap(next);
  }, [activeTab, students, fTalkDate]);

  useEffect(() => {
    loadFTalk();
  }, [loadFTalk]);

  const saveCurrent = async () => {
    if (!selectedStudentUid) {
      Alert.alert("Select Student", "Please select a student first.");
      return;
    }

    setSaving(true);
    try {
      if (activeTab === "reading") {
        const { error } = await supabase.from("internal_reading_marks").upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            book_name: reading.book_name.trim(),
            author_name: reading.author_name.trim(),
            pages_read: Number(reading.pages_read) || 0,
            language: reading.language,
            book_type: reading.book_type,
            created_by: details?.uid,
          },
          { onConflict: "student_uid,entry_date" }
        );
        if (error) throw error;
      }

      if (activeTab === "writing") {
        const { error } = await supabase.from("internal_writing_marks").upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            language: writing.language,
            writing_type: writing.writing_type,
            pages_written: Number(writing.pages_written) || 0,
            published_in: writing.published_in,
            created_by: details?.uid,
          },
          { onConflict: "student_uid,entry_date" }
        );
        if (error) throw error;
      }

      if (activeTab === "newspaper") {
        const { error } = await supabase.from("internal_newspaper_marks").upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            language: newspaper.language,
            newspaper_names: newspaper.newspaper_names,
            sections_read: newspaper.sections_read,
            created_by: details?.uid,
          },
          { onConflict: "student_uid,entry_date" }
        );
        if (error) throw error;
      }

      if (activeTab === "general") {
        const { error } = await supabase.from("internal_general_marks").upsert(
          {
            student_uid: selectedStudentUid,
            entry_date: selectedDate,
            ...general,
            created_by: details?.uid,
          },
          { onConflict: "student_uid,entry_date" }
        );
        if (error) throw error;
      }

      Alert.alert("Saved", "Internal mark data saved successfully.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Could not save data.");
    } finally {
      setSaving(false);
    }
  };

  const saveMorningTalk = async () => {
    setSaving(true);
    try {
      const payload = students.map((student) => ({
        student_uid: student.uid,
        entry_date: morningDate,
        present: morningMap[student.uid]?.present ?? true,
        mark: morningMap[student.uid]?.mark ?? 0,
        created_by: details?.uid,
      }));

      const { error } = await supabase
        .from("internal_morning_talk_attendance")
        .upsert(payload, { onConflict: "student_uid,entry_date" });

      if (error) throw error;
      Alert.alert("Saved", "Morning Talk attendance saved successfully.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const saveFTalk = async () => {
    setSaving(true);
    try {
      const payload = students.map((student) => ({
        student_uid: student.uid,
        entry_date: fTalkDate,
        talked: fTalkMap[student.uid]?.talked ?? false,
        mark: fTalkMap[student.uid]?.mark ?? 0,
        created_by: details?.uid,
      }));

      const { error } = await supabase
        .from("internal_f_talk_marks")
        .upsert(payload, { onConflict: "student_uid,entry_date" });

      if (error) throw error;
      Alert.alert("Saved", "F-Talk records saved successfully.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Could not save F-Talk records.");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async () => {
    if (!selectedStudentUid) {
      Alert.alert("Select Student", "Please select a student before adding a skill.");
      return;
    }

    const skillName = skillInput.trim();
    if (!skillName) return;

    try {
      const { error } = await supabase.from("internal_student_skills").insert({
        student_uid: selectedStudentUid,
        skill_name: skillName,
        created_by: details?.uid,
      });

      if (error) throw error;
      setSkillInput("");
      await loadSkills();
    } catch (err: any) {
      Alert.alert("Skill Save Failed", err.message || "Could not add skill.");
    }
  };

  const removeSkill = async (skillId: string) => {
    try {
      const { error } = await supabase
        .from("internal_student_skills")
        .delete()
        .eq("id", skillId);

      if (error) throw error;
      await loadSkills();
    } catch (err: any) {
      Alert.alert("Remove Failed", err.message || "Could not remove skill.");
    }
  };

  const exportExcelReport = async () => {
    if (students.length === 0 || exporting) return;

    try {
      setExporting(true);

      const studentIds = students.map((student) => student.uid);
      const [
        { data: readingRows, error: readingError },
        { data: writingRows, error: writingError },
        { data: newspaperRows, error: newspaperError },
        { data: generalRows, error: generalError },
        { data: skillRows, error: skillError },
        { data: morningRows, error: morningError },
        { data: fTalkRows, error: fTalkError },
      ] = await Promise.all([
        supabase.from("internal_reading_marks").select("*").in("student_uid", studentIds),
        supabase.from("internal_writing_marks").select("*").in("student_uid", studentIds),
        supabase.from("internal_newspaper_marks").select("*").in("student_uid", studentIds),
        supabase.from("internal_general_marks").select("*").in("student_uid", studentIds),
        supabase.from("internal_student_skills").select("*").in("student_uid", studentIds),
        supabase.from("internal_morning_talk_attendance").select("*").in("student_uid", studentIds),
        supabase.from("internal_f_talk_marks").select("*").in("student_uid", studentIds),
      ]);

      const firstError =
        readingError ||
        writingError ||
        newspaperError ||
        generalError ||
        skillError ||
        morningError ||
        fTalkError;
      if (firstError) throw firstError;

      const groupByStudent = <T extends { student_uid: string }>(rows: T[] = []) => {
        const grouped: Record<string, T[]> = {};
        rows.forEach((row) => {
          if (!grouped[row.student_uid]) grouped[row.student_uid] = [];
          grouped[row.student_uid].push(row);
        });
        return grouped;
      };

      const readingByStudent = groupByStudent(readingRows || []);
      const writingByStudent = groupByStudent(writingRows || []);
      const newspaperByStudent = groupByStudent(newspaperRows || []);
      const generalByStudent = groupByStudent(generalRows || []);
      const skillsByStudent = groupByStudent(skillRows || []);
      const morningByStudent = groupByStudent(morningRows || []);
      const fTalkByStudent = groupByStudent(fTalkRows || []);

      const workbook = utils.book_new();

      const overallRows: any[][] = [
        ["Internal Marks Overall Report"],
        ["Batch", details?.batch || ""],
        ["Generated", formatDateDisplay(todayDateValue())],
        [],
      ];

      const addTopSection = (
        title: string,
        items: { student: StudentOption; value: number }[],
        valueLabel: string
      ) => {
        overallRows.push([title]);
        overallRows.push(["Rank", "Name", "CIC", "Class", valueLabel]);
        if (items.length === 0) {
          overallRows.push(["No data"]);
        } else {
          items.forEach((item, index) => {
            overallRows.push([
              index + 1,
              item.student.name,
              item.student.cic || "",
              item.student.class_id,
              item.value,
            ]);
          });
        }
        overallRows.push([]);
      };

      addTopSection(
        "Top 5 Reading",
        topFive(students, (student) => readingByStudent[student.uid]?.length || 0),
        "Entries"
      );
      addTopSection(
        "Top 5 Writing",
        topFive(students, (student) => writingByStudent[student.uid]?.length || 0),
        "Entries"
      );
      addTopSection(
        "Top 5 Newspaper",
        topFive(students, (student) => newspaperByStudent[student.uid]?.length || 0),
        "Entries"
      );
      addTopSection(
        "Top 5 General",
        topFive(students, (student) => {
          const rows = generalByStudent[student.uid] || [];
          return rows.reduce((total: number, row: any) => {
            return (
              total +
              ["law_practice", "cleaness", "spirituality"].filter(
                (key) => row[`${key}_status`] === "positive"
              ).length
            );
          }, 0);
        }),
        "Positive Count"
      );
      addTopSection(
        "Top 5 Morning Talk",
        topFive(students, (student) =>
          (morningByStudent[student.uid] || []).filter((row: any) => row.present).length
        ),
        "Participated"
      );
      addTopSection(
        "Top 5 F-Talk",
        topFive(students, (student) =>
          (fTalkByStudent[student.uid] || []).filter((row: any) => row.talked).length
        ),
        "Presented"
      );

      utils.book_append_sheet(workbook, utils.aoa_to_sheet(overallRows), "Overall");

      const usedSheetNames = new Set(["Overall"]);
      students.forEach((student) => {
        const rows: any[][] = [
          ["Name", student.name],
          ["CIC", student.cic || ""],
          ["Class", student.class_id],
          ["Batch", student.batch || ""],
        ];

        addSection(
          rows,
          "Reading",
          ["Date", "Book Name", "Author", "Pages", "Language", "Book Type"],
          (readingByStudent[student.uid] || [])
            .sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date))
            .map((row: any) => [
              formatDateDisplay(row.entry_date),
              row.book_name,
              row.author_name,
              row.pages_read,
              row.language,
              row.book_type,
            ])
        );

        addSection(
          rows,
          "Writing",
          ["Date", "Language", "Type", "Pages", "Published In"],
          (writingByStudent[student.uid] || [])
            .sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date))
            .map((row: any) => [
              formatDateDisplay(row.entry_date),
              row.language,
              row.writing_type,
              row.pages_written,
              row.published_in,
            ])
        );

        addSection(
          rows,
          "Newspaper",
          ["Date", "Language", "Newspapers", "Sections Read"],
          (newspaperByStudent[student.uid] || [])
            .sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date))
            .map((row: any) => [
              formatDateDisplay(row.entry_date),
              row.language,
              commaList(row.newspaper_names),
              commaList(row.sections_read),
            ])
        );

        const generalData = generalByStudent[student.uid] || [];
        const generalSummary = ["law_practice", "cleaness", "spirituality"].map((key) => {
          const label =
            key === "law_practice"
              ? "Law practice"
              : key === "cleaness"
              ? "Cleaness"
              : "Spirituality";
          const positiveRows = generalData.filter((row: any) => row[`${key}_status`] === "positive");
          const negativeRows = generalData.filter((row: any) => row[`${key}_status`] === "negative");
          return [
            label,
            positiveRows.length,
            negativeRows.length,
            positiveRows.map((row: any) => row[`${key}_note`]).filter(Boolean).join(" | "),
            negativeRows.map((row: any) => row[`${key}_note`]).filter(Boolean).join(" | "),
          ];
        });

        addSection(
          rows,
          "General",
          ["Label", "Total Positive", "Total Negative", "Positive Messages", "Negative Messages"],
          generalSummary
        );

        addSection(
          rows,
          "Skills",
          ["Skills"],
          [[(skillsByStudent[student.uid] || []).map((row: any) => row.skill_name).join(", ")]]
        );

        const morningData = morningByStudent[student.uid] || [];
        const morningParticipated = morningData.filter((row: any) => row.present).length;
        const morningTotalMarks = morningData.reduce((total: number, row: any) => total + (row.mark || 0), 0);
        addSection(
          rows,
          "Morning Talk",
          ["Participated Count", "Total Mark", "Out Of"],
          [[morningParticipated, morningTotalMarks, morningData.length * 10]]
        );

        const fTalkData = fTalkByStudent[student.uid] || [];
        const fTalkPresented = fTalkData.filter((row: any) => row.talked).length;
        const fTalkTotalMarks = fTalkData.reduce((total: number, row: any) => total + (row.mark || 0), 0);
        addSection(
          rows,
          "F-Talk",
          ["Presented Count", "Total Mark", "Out Of"],
          [[fTalkPresented, fTalkTotalMarks, fTalkData.length * 10]]
        );

        const sheetName = safeSheetName(student.name, student.cic || student.uid, usedSheetNames);
        utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), sheetName);
      });

      const workbookBase64 = write(workbook, { type: "base64", bookType: "xlsx" });
      const fileUri = `${FileSystem.cacheDirectory}Internal_Marks_${details?.batch || "Report"}.xlsx`;

      await FileSystem.writeAsStringAsync(fileUri, workbookBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri, {
        dialogTitle: "Export Internal Marks Report",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } catch (err: any) {
      Alert.alert("Export Failed", err.message || "Could not export report.");
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { key: "reading", label: "Reading", icon: BookOpen },
    { key: "writing", label: "Writing", icon: PenLine },
    { key: "newspaper", label: "Newspaper", icon: Newspaper },
    { key: "general", label: "General", icon: ClipboardList },
    { key: "morning", label: "Morning Talk", icon: Mic2 },
    { key: "fTalk", label: "F-Talk", icon: FileText },
  ] as const;

  if (userLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Internal Marks...</Text>
      </SafeAreaView>
    );
  }

  if (!eligible) {
    return (
      <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
        <View style={styles.emptyAccessCard}>
          <ClipboardList size={42} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Internal Marks Unavailable</Text>
          <Text style={styles.emptyText}>
            This section is available only for class teachers from Batch 17 and higher.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredMorningStudents = students.filter((student) => {
    const q = morningSearch.trim().toLowerCase();
    return (
      !q ||
      student.name.toLowerCase().includes(q) ||
      student.cic?.toLowerCase().includes(q) ||
      student.class_id.toLowerCase().includes(q)
    );
  });

  const filteredFTalkStudents = students.filter((student) => {
    const q = fTalkSearch.trim().toLowerCase();
    return (
      !q ||
      student.name.toLowerCase().includes(q) ||
      student.cic?.toLowerCase().includes(q) ||
      student.class_id.toLowerCase().includes(q)
    );
  });

  const commonFormHeader = !["morning", "fTalk"].includes(activeTab) ? (
    <View style={styles.formHeaderCard}>
      <SearchableStudentPicker
        students={students}
        value={selectedStudentUid}
        onSelect={setSelectedStudentUid}
      />
      <DateSelector
        value={selectedDate}
        onChange={setSelectedDate}
      />
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={saveCurrent}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={theme.colors.textOnDark} />
        ) : (
          <Save size={17} color={theme.colors.textOnDark} />
        )}
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <ClipboardList size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.heroPill}>
              <Sparkles size={13} color={theme.colors.accent} />
              <Text style={styles.heroPillText}>{details?.batch}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Internal Marks</Text>
          <Text style={styles.heroSubtitle}>
            Record reading, writing, newspaper, general, Morning Talk, and F-Talk details for your class.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.disabledButton]}
          onPress={exportExcelReport}
          disabled={exporting}
          activeOpacity={0.84}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={theme.colors.textOnDark} />
          ) : (
            <FileDown size={18} color={theme.colors.textOnDark} />
          )}
          <Text style={styles.exportButtonText}>
            {exporting ? "Preparing Report..." : "Download Full Excel Report"}
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Icon size={15} color={active ? theme.colors.textOnDark : theme.colors.primary} />
                <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {commonFormHeader}

        {activeTab === "reading" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reading</Text>
            <Text style={styles.cardDesc}>{selectedStudent?.name || "Select a student"} | {formatDateDisplay(selectedDate)}</Text>
            <Text style={styles.inputLabel}>Book Name</Text>
            <TextInput style={styles.input} value={reading.book_name} onChangeText={(book_name) => setReading((p) => ({ ...p, book_name }))} placeholder="Book name" placeholderTextColor={theme.colors.textMuted} />
            <Text style={styles.inputLabel}>Author Name</Text>
            <TextInput style={styles.input} value={reading.author_name} onChangeText={(author_name) => setReading((p) => ({ ...p, author_name }))} placeholder="Author name" placeholderTextColor={theme.colors.textMuted} />
            <Text style={styles.inputLabel}>Pages Read</Text>
            <TextInput style={styles.input} value={reading.pages_read} onChangeText={(pages_read) => setReading((p) => ({ ...p, pages_read }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} />
            <Text style={styles.inputLabel}>Language</Text>
            <CustomPicker value={reading.language} options={LANGUAGE_OPTIONS} placeholder="Language" onSelect={(language) => setReading((p) => ({ ...p, language }))} />
            <Text style={styles.inputLabel}>Book Type</Text>
            <CustomPicker value={reading.book_type} options={BOOK_TYPE_OPTIONS} placeholder="Book Type" onSelect={(book_type) => setReading((p) => ({ ...p, book_type }))} />
          </View>
        )}

        {activeTab === "writing" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Writing</Text>
            <Text style={styles.cardDesc}>{selectedStudent?.name || "Select a student"} | {formatDateDisplay(selectedDate)}</Text>
            <Text style={styles.inputLabel}>Language</Text>
            <CustomPicker value={writing.language} options={LANGUAGE_OPTIONS} placeholder="Language" onSelect={(language) => setWriting((p) => ({ ...p, language }))} />
            <Text style={styles.inputLabel}>Type</Text>
            <CustomPicker value={writing.writing_type} options={BOOK_TYPE_OPTIONS} placeholder="Type" onSelect={(writing_type) => setWriting((p) => ({ ...p, writing_type }))} />
            <Text style={styles.inputLabel}>Pages Written</Text>
            <TextInput style={styles.input} value={writing.pages_written} onChangeText={(pages_written) => setWriting((p) => ({ ...p, pages_written }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} />
            <Text style={styles.inputLabel}>Published In</Text>
            <CustomPicker value={writing.published_in} options={PUBLISHED_OPTIONS} placeholder="Published In" onSelect={(published_in) => setWriting((p) => ({ ...p, published_in }))} />
          </View>
        )}

        {activeTab === "newspaper" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Newspaper</Text>
            <Text style={styles.cardDesc}>{selectedStudent?.name || "Select a student"} | {formatDateDisplay(selectedDate)}</Text>
            <Text style={styles.inputLabel}>Language</Text>
            <CustomPicker
              value={newspaper.language}
              options={LANGUAGE_OPTIONS}
              placeholder="Language"
              onSelect={(language) =>
                setNewspaper({ language, newspaper_names: [], sections_read: [] })
              }
            />
            <Text style={styles.inputLabel}>Newspapers</Text>
            <MultiChoice values={newspaper.newspaper_names} options={NEWSPAPERS[newspaper.language] || []} onChange={(newspaper_names) => setNewspaper((p) => ({ ...p, newspaper_names }))} />
            <Text style={styles.inputLabel}>Sections Read</Text>
            <MultiChoice values={newspaper.sections_read} options={NEWSPAPER_SECTIONS} onChange={(sections_read) => setNewspaper((p) => ({ ...p, sections_read }))} />
          </View>
        )}

        {activeTab === "general" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>General</Text>
            <Text style={styles.cardDesc}>{selectedStudent?.name || "Select a student"} | {formatDateDisplay(selectedDate)}</Text>
            {GENERAL_FIELDS.map((field) => (
              <ToneInput
                key={field.key}
                label={field.label}
                tone={general[`${field.key}_status` as keyof typeof general] as Tone}
                text={general[`${field.key}_note` as keyof typeof general] as string}
                onToneChange={(value) => setGeneral((p) => ({ ...p, [`${field.key}_status`]: value }))}
                onTextChange={(value) => setGeneral((p) => ({ ...p, [`${field.key}_note`]: value }))}
              />
            ))}

            <View style={styles.skillsCard}>
              <Text style={styles.inputLabel}>Skills</Text>
              <Text style={styles.skillsHint}>
                Skills are saved separately for the student and do not change with the selected date.
              </Text>
              <View style={styles.skillInputRow}>
                <TextInput
                  value={skillInput}
                  onChangeText={setSkillInput}
                  placeholder="Type a skill..."
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.skillInput}
                />
                <TouchableOpacity style={styles.skillAddButton} onPress={addSkill}>
                  <Text style={styles.skillAddButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.skillBubbleWrap}>
                {skills.length === 0 ? (
                  <Text style={styles.skillsEmptyText}>No skills added yet.</Text>
                ) : (
                  skills.map((skill) => (
                    <View key={skill.id} style={styles.skillBubble}>
                      <Text style={styles.skillBubbleText}>{skill.skill_name}</Text>
                      <TouchableOpacity onPress={() => removeSkill(skill.id)} style={styles.skillRemoveButton}>
                        <Text style={styles.skillRemoveText}>›</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === "morning" && (
          <View style={styles.card}>
            <View style={styles.morningHeader}>
              <View style={styles.morningHeaderText}>
                <Text style={styles.cardTitle}>Morning Talk</Text>
                <Text style={styles.cardDesc}>Students are absent by default. Tap the checkbox when they present.</Text>
              </View>
              <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={saveMorningTalk} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={theme.colors.textOnDark} /> : <Save size={17} color={theme.colors.textOnDark} />}
                <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
            <DateSelector value={morningDate} onChange={setMorningDate} />
            <InlineSearch value={morningSearch} onChange={setMorningSearch} />
            <View style={styles.studentList}>
              {filteredMorningStudents.map((student) => {
                const record = morningMap[student.uid] || { present: false, mark: 0 };
                return (
                  <View key={student.uid} style={styles.morningRow}>
                    <View style={styles.morningStudentText}>
                      <Text style={styles.morningStudentName}>{student.name}</Text>
                      <Text style={styles.morningStudentMeta}>CIC: {student.cic || "-"}</Text>
                      <TouchableOpacity
                        style={[styles.checkCardCompact, record.present && styles.checkCardActive]}
                        onPress={() =>
                          setMorningMap((p) => ({
                            ...p,
                            [student.uid]: {
                              ...record,
                              present: !record.present,
                            },
                          }))
                        }
                        activeOpacity={0.84}
                      >
                        <View style={[styles.checkBox, record.present && styles.checkBoxActive]}>
                          {record.present ? <Check size={16} color={theme.colors.textOnDark} /> : null}
                        </View>
                        <Text style={[styles.checkCardText, record.present && styles.checkCardTextActive]}>
                          Marked as presented in Morning Talk.
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <MarkPicker
                      value={record.mark}
                      onChange={(mark) =>
                        setMorningMap((p) => ({
                          ...p,
                          [student.uid]: {
                            ...record,
                            mark,
                          },
                        }))
                      }
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {activeTab === "fTalk" && (
          <View style={styles.card}>
            <View style={styles.morningHeader}>
              <View style={styles.morningHeaderText}>
                <Text style={styles.cardTitle}>F-Talk</Text>
                <Text style={styles.cardDesc}>
                  Mark each student who delivered the F-Talk presentation and assign a mark.
                </Text>
              </View>
              <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={saveFTalk} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={theme.colors.textOnDark} /> : <Save size={17} color={theme.colors.textOnDark} />}
                <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
            <DateSelector value={fTalkDate} onChange={setFTalkDate} />
            <InlineSearch value={fTalkSearch} onChange={setFTalkSearch} />
            <View style={styles.studentList}>
              {filteredFTalkStudents.map((student) => {
                const record = fTalkMap[student.uid] || { talked: false, mark: 0 };
                return (
                  <View key={student.uid} style={styles.morningRow}>
                    <View style={styles.morningStudentText}>
                      <Text style={styles.morningStudentName}>{student.name}</Text>
                      <Text style={styles.morningStudentMeta}>CIC: {student.cic || "-"}</Text>
                      <TouchableOpacity
                        style={[styles.checkCardCompact, record.talked && styles.checkCardActive]}
                        onPress={() =>
                          setFTalkMap((p) => ({
                            ...p,
                            [student.uid]: {
                              ...record,
                              talked: !record.talked,
                            },
                          }))
                        }
                        activeOpacity={0.84}
                      >
                        <View style={[styles.checkBox, record.talked && styles.checkBoxActive]}>
                          {record.talked ? <Check size={16} color={theme.colors.textOnDark} /> : null}
                        </View>
                        <Text style={[styles.checkCardText, record.talked && styles.checkCardTextActive]}>
                          This student delivered the F-Talk presentation.
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <MarkPicker
                      value={record.mark}
                      onChange={(mark) =>
                        setFTalkMap((p) => ({
                          ...p,
                          [student.uid]: {
                            ...record,
                            mark,
                          },
                        }))
                      }
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: 90 },
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },
  heroCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 18,
    ...theme.shadows.medium,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
  },
  heroPillText: { color: theme.colors.accent, fontSize: 12, fontFamily: "MullerBold" },
  heroTitle: { color: theme.colors.text, fontSize: 30, lineHeight: 36, fontFamily: "MullerBold" },
  heroSubtitle: { marginTop: 8, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: "MullerMedium" },
  exportButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  exportButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    fontFamily: "MullerBold",
  },
  tabsScroll: { gap: 8, paddingBottom: 16 },
  tabButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabButtonText: { color: theme.colors.primary, fontSize: 13, fontFamily: "MullerBold" },
  tabButtonTextActive: { color: theme.colors.textOnDark },
  formHeaderCard: {
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  cardTitle: { color: theme.colors.text, fontSize: 19, lineHeight: 24, fontFamily: "MullerBold" },
  cardDesc: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: "MullerMedium", marginTop: 4, marginBottom: 14 },
  inputLabel: { marginTop: 12, marginBottom: 6, color: theme.colors.textSecondary, fontSize: 12, fontFamily: "MullerMedium" },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 12,
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },
  textArea: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },
  pickerButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 12,
  },
  pickerButtonText: { flex: 1, color: theme.colors.text, fontSize: 14, fontFamily: "MullerMedium" },
  pickerPlaceholder: { flex: 1, color: theme.colors.textMuted, fontSize: 14, fontFamily: "MullerMedium" },
  saveButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
  },
  saveButtonText: { color: theme.colors.textOnDark, fontSize: 14, fontFamily: "MullerBold" },
  disabledButton: { opacity: 0.65 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.46)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "72%", backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontFamily: "MullerBold" },
  modalCloseBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: theme.colors.surfaceSoft },
  searchBox: { margin: 14, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 14, fontFamily: "MullerMedium" },
  inlineSearchBox: { marginTop: 12, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: 12 },
  inlineSearchInput: { flex: 1, color: theme.colors.text, fontSize: 14, fontFamily: "MullerMedium" },
  studentOption: { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceSoft },
  studentOptionName: { color: theme.colors.text, fontSize: 15, fontFamily: "MullerBold" },
  studentOptionMeta: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, fontFamily: "MullerMedium" },
  pickerItem: { paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceSoft },
  pickerItemText: { color: theme.colors.text, fontSize: 15, fontFamily: "MullerMedium" },
  pickerItemTextActive: { color: theme.colors.primary, fontFamily: "MullerBold" },
  modalEmpty: { padding: 24, alignItems: "center" },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft },
  choiceChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  choiceChipText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: "MullerBold" },
  choiceChipTextActive: { color: theme.colors.textOnDark },
  markWrap: { width: 104 },
  markLabel: { marginBottom: 6, color: theme.colors.textSecondary, fontSize: 11, fontFamily: "MullerBold", textAlign: "center" },
  toneCard: { marginTop: 10, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft },
  toneRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  toneButton: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1 },
  tonePositive: { backgroundColor: theme.colors.successSoft, borderColor: "rgba(22,163,74,0.14)" },
  toneNegative: { backgroundColor: theme.colors.errorSoft, borderColor: "rgba(220,38,38,0.14)" },
  toneButtonActive: { borderColor: theme.colors.primary },
  toneButtonText: { fontSize: 13, fontFamily: "MullerBold", color: theme.colors.textSecondary },
  toneButtonTextActive: { color: theme.colors.text },
  skillsCard: { marginTop: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft },
  skillsHint: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: "MullerMedium", marginBottom: 10 },
  skillInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  skillInput: { flex: 1, minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14, fontFamily: "MullerMedium" },
  skillAddButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  skillAddButtonText: { color: theme.colors.textOnDark, fontSize: 13, fontFamily: "MullerBold" },
  skillBubbleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  skillBubble: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.primaryTint, backgroundColor: theme.colors.primarySoft, paddingVertical: 7, paddingLeft: 12, paddingRight: 8 },
  skillBubbleText: { color: theme.colors.primary, fontSize: 12, fontFamily: "MullerBold" },
  skillRemoveButton: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
  skillRemoveText: { color: theme.colors.primary, fontSize: 13, lineHeight: 16, fontFamily: "MullerBold" },
  skillsEmptyText: { color: theme.colors.textMuted, fontSize: 12, fontFamily: "MullerMedium" },
  morningHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  morningHeaderText: { flex: 1 },
  studentList: { gap: 10, marginTop: 14 },
  morningRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft },
  morningStudentText: { flex: 1 },
  morningStudentName: { color: theme.colors.text, fontSize: 14, fontFamily: "MullerBold" },
  morningStudentMeta: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 12, fontFamily: "MullerMedium" },
  presenceToggle: { minWidth: 86, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  presentToggle: { backgroundColor: theme.colors.success },
  absentToggle: { backgroundColor: theme.colors.error },
  presenceToggleText: { color: theme.colors.textOnDark, fontSize: 12, fontFamily: "MullerBold" },
  checkCard: { flexDirection: "row", gap: 12, alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, padding: 14 },
  checkCardCompact: { marginTop: 10, flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 10 },
  checkCardActive: { backgroundColor: theme.colors.successSoft, borderColor: "rgba(22,163,74,0.14)" },
  checkBox: { width: 28, height: 28, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
  checkBoxActive: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  checkCardText: { flex: 1, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: "MullerMedium" },
  checkCardTextActive: { color: theme.colors.text },
  emptyAccessCard: { margin: 20, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: "center", ...theme.shadows.soft },
  emptyTitle: { marginTop: 14, color: theme.colors.text, fontSize: 20, fontFamily: "MullerBold" },
  emptyText: { marginTop: 8, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: "MullerMedium", textAlign: "center" },
});
