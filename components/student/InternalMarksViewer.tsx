import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FilePenLine,
  Languages,
  Lightbulb,
  MessageSquareText,
  Newspaper,
  Sparkles,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";

type SectionKey =
  | "reading"
  | "writing"
  | "newspaper"
  | "general"
  | "skills"
  | "morning"
  | "fTalk";

type InternalData = {
  reading: any[];
  writing: any[];
  newspaper: any[];
  general: any[];
  skills: any[];
  morning: any[];
  fTalk: any[];
};

const EMPTY_DATA: InternalData = {
  reading: [],
  writing: [],
  newspaper: [],
  general: [],
  skills: [],
  morning: [],
  fTalk: [],
};

const GENERAL_FIELDS = [
  { key: "law_practice", label: "Law Practice" },
  { key: "cleaness", label: "Cleaness" },
  { key: "spirituality", label: "Spirituality" },
];

export function isInternalMarksBatch(batch?: string | null) {
  const match = batch?.match(/Batch\s+(\d+)/i);
  return match ? Number(match[1]) >= 17 : false;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function listText(value?: string[] | null) {
  return value?.length ? value.join(", ") : "-";
}

function EmptyState({ label }: { label: string }) {
  return <Text style={styles.emptyText}>No {label} records found.</Text>;
}

function RecordCard({
  number,
  fields,
}: {
  number: number;
  fields: { label: string; value: React.ReactNode }[];
}) {
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordNumber}>
        <Text style={styles.recordNumberText}>{number}</Text>
      </View>
      <View style={styles.recordFields}>
        {fields.map((field) => (
          <View key={field.label} style={styles.recordField}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>
              {field.value === null ||
              field.value === undefined ||
              field.value === ""
                ? "-"
                : field.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Accordion({
  title,
  subtitle,
  icon: Icon,
  open,
  onPress,
  children,
}: {
  title: string;
  subtitle: string;
  icon: any;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.accordion}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={onPress}
        style={styles.accordionHeader}
      >
        <View style={styles.sectionIcon}>
          <Icon size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.accordionTitleWrap}>
          <Text style={styles.accordionTitle}>{title}</Text>
          <Text style={styles.accordionSubtitle}>{subtitle}</Text>
        </View>
        {open ? (
          <ChevronUp size={20} color={theme.colors.textMuted} />
        ) : (
          <ChevronDown size={20} color={theme.colors.textMuted} />
        )}
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

export default function InternalMarksViewer({
  studentUid,
  dashboard = false,
}: {
  studentUid: string;
  dashboard?: boolean;
}) {
  const [data, setData] = useState<InternalData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [generalMode, setGeneralMode] = useState<"positive" | "negative">(
    "positive"
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const results = await Promise.all([
          supabase
            .from("internal_reading_marks")
            .select("*")
            .eq("student_uid", studentUid)
            .order("entry_date", { ascending: false }),
          supabase
            .from("internal_writing_marks")
            .select("*")
            .eq("student_uid", studentUid)
            .order("entry_date", { ascending: false }),
          supabase
            .from("internal_newspaper_marks")
            .select("*")
            .eq("student_uid", studentUid)
            .order("entry_date", { ascending: false }),
          supabase
            .from("internal_general_marks")
            .select("*")
            .eq("student_uid", studentUid)
            .order("entry_date", { ascending: false }),
          supabase
            .from("internal_student_skills")
            .select("*")
            .eq("student_uid", studentUid)
            .order("skill_name"),
          supabase
            .from("internal_morning_talk_attendance")
            .select("*")
            .eq("student_uid", studentUid)
            .eq("present", true)
            .order("entry_date", { ascending: false }),
          supabase
            .from("internal_f_talk_marks")
            .select("*")
            .eq("student_uid", studentUid)
            .eq("talked", true)
            .order("entry_date", { ascending: false }),
        ]);

        const firstError = results.find((result) => result.error)?.error;
        if (firstError) throw firstError;

        if (mounted) {
          setData({
            reading: results[0].data || [],
            writing: results[1].data || [],
            newspaper: results[2].data || [],
            general: results[3].data || [],
            skills: results[4].data || [],
            morning: results[5].data || [],
            fTalk: results[6].data || [],
          });
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || "Unable to load internal marks.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [studentUid]);

  const generalNotes = useMemo(
    () =>
      data.general.flatMap((entry) =>
        GENERAL_FIELDS.flatMap((field) => {
          const note = entry[`${field.key}_note`];
          const status = entry[`${field.key}_status`];
          return note?.trim()
            ? [{ date: entry.entry_date, type: field.label, note, status }]
            : [];
        })
      ),
    [data.general]
  );

  const visibleGeneral = generalNotes.filter(
    (note) => note.status === generalMode
  );
  const positiveCount = generalNotes.filter(
    (note) => note.status === "positive"
  ).length;
  const negativeCount = generalNotes.filter(
    (note) => note.status === "negative"
  ).length;
  const morningTotal = data.morning.reduce(
    (total, entry) => total + Number(entry.mark || 0),
    0
  );
  const fTalkTotal = data.fTalk.reduce(
    (total, entry) => total + Number(entry.mark || 0),
    0
  );

  const toggle = (section: SectionKey) =>
    setOpenSection((current) => (current === section ? null : section));

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading internal records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Unable to load Internal Marks</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, dashboard && styles.dashboardRoot]}>
      {dashboard && (
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardIcon}>
            <Sparkles size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.dashboardHeaderText}>
            <Text style={styles.dashboardTitle}>My Internal Progress</Text>
            <Text style={styles.dashboardSubtitle}>
              Reading, writing, skills, and talk records.
            </Text>
          </View>
        </View>
      )}

      <Accordion
        title="Reading"
        subtitle={`${data.reading.length} record${data.reading.length === 1 ? "" : "s"}`}
        icon={BookOpen}
        open={openSection === "reading"}
        onPress={() => toggle("reading")}
      >
        {data.reading.length ? (
          data.reading.map((entry, index) => (
            <RecordCard
              key={entry.id}
              number={index + 1}
              fields={[
                { label: "Date", value: formatDate(entry.entry_date) },
                { label: "Book", value: entry.book_name },
                { label: "Author", value: entry.author_name },
                { label: "Pages Read", value: entry.pages_read },
                { label: "Language", value: entry.language },
                { label: "Type", value: entry.book_type },
              ]}
            />
          ))
        ) : (
          <EmptyState label="reading" />
        )}
      </Accordion>

      <Accordion
        title="Writing"
        subtitle={`${data.writing.length} record${data.writing.length === 1 ? "" : "s"}`}
        icon={FilePenLine}
        open={openSection === "writing"}
        onPress={() => toggle("writing")}
      >
        {data.writing.length ? (
          data.writing.map((entry, index) => (
            <RecordCard
              key={entry.id}
              number={index + 1}
              fields={[
                { label: "Date", value: formatDate(entry.entry_date) },
                { label: "Language", value: entry.language },
                { label: "Type", value: entry.writing_type },
                { label: "Pages Written", value: entry.pages_written },
                { label: "Published In", value: entry.published_in },
              ]}
            />
          ))
        ) : (
          <EmptyState label="writing" />
        )}
      </Accordion>

      <Accordion
        title="Newspaper"
        subtitle={`${data.newspaper.length} record${data.newspaper.length === 1 ? "" : "s"}`}
        icon={Newspaper}
        open={openSection === "newspaper"}
        onPress={() => toggle("newspaper")}
      >
        {data.newspaper.length ? (
          data.newspaper.map((entry, index) => (
            <RecordCard
              key={entry.id}
              number={index + 1}
              fields={[
                { label: "Date", value: formatDate(entry.entry_date) },
                { label: "Language", value: entry.language },
                { label: "Newspapers", value: listText(entry.newspaper_names) },
                { label: "Sections", value: listText(entry.sections_read) },
              ]}
            />
          ))
        ) : (
          <EmptyState label="newspaper" />
        )}
      </Accordion>

      <Accordion
        title="General"
        subtitle={`${generalNotes.length} note${generalNotes.length === 1 ? "" : "s"}`}
        icon={MessageSquareText}
        open={openSection === "general"}
        onPress={() => toggle("general")}
      >
        <View style={styles.generalTabs}>
          {(["positive", "negative"] as const).map((mode) => {
            const count = mode === "positive" ? positiveCount : negativeCount;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setGeneralMode(mode)}
                style={[
                  styles.generalTab,
                  generalMode === mode &&
                    (mode === "positive"
                      ? styles.positiveTab
                      : styles.negativeTab),
                ]}
              >
                <Text
                  style={[
                    styles.generalTabText,
                    generalMode === mode &&
                      (mode === "positive"
                        ? styles.positiveText
                        : styles.negativeText),
                  ]}
                >
                  {mode === "positive" ? "Positive" : "Negative"}
                </Text>
                <Text style={styles.generalCount}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {visibleGeneral.length ? (
          visibleGeneral.map((note, index) => (
            <RecordCard
              key={`${note.date}-${note.type}-${index}`}
              number={index + 1}
              fields={[
                { label: "Date", value: formatDate(note.date) },
                { label: "Type", value: note.type },
                { label: "Note", value: note.note },
              ]}
            />
          ))
        ) : (
          <EmptyState label={`${generalMode} general`} />
        )}
      </Accordion>

      <Accordion
        title="Skills"
        subtitle={`${data.skills.length} skill${data.skills.length === 1 ? "" : "s"}`}
        icon={Lightbulb}
        open={openSection === "skills"}
        onPress={() => toggle("skills")}
      >
        {data.skills.length ? (
          <View style={styles.skillsWrap}>
            {data.skills.map((skill) => (
              <View key={skill.id} style={styles.skillPill}>
                <Text style={styles.skillText}>{skill.skill_name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState label="skill" />
        )}
      </Accordion>

      <Accordion
        title="Morning Talk"
        subtitle={`${data.morning.length} participated`}
        icon={Languages}
        open={openSection === "morning"}
        onPress={() => toggle("morning")}
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Marks</Text>
          <Text style={styles.totalValue}>
            {morningTotal}/{data.morning.length * 10}
          </Text>
        </View>
        {data.morning.length ? (
          data.morning.map((entry, index) => (
            <RecordCard
              key={entry.id}
              number={index + 1}
              fields={[
                { label: "Date", value: formatDate(entry.entry_date) },
                { label: "Mark", value: `${entry.mark || 0}/10` },
              ]}
            />
          ))
        ) : (
          <EmptyState label="morning talk" />
        )}
      </Accordion>

      <Accordion
        title="F-Talk"
        subtitle={`${data.fTalk.length} participated`}
        icon={Languages}
        open={openSection === "fTalk"}
        onPress={() => toggle("fTalk")}
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Marks</Text>
          <Text style={styles.totalValue}>
            {fTalkTotal}/{data.fTalk.length * 10}
          </Text>
        </View>
        {data.fTalk.length ? (
          data.fTalk.map((entry, index) => (
            <RecordCard
              key={entry.id}
              number={index + 1}
              fields={[
                { label: "Date", value: formatDate(entry.entry_date) },
                { label: "Mark", value: `${entry.mark || 0}/10` },
              ]}
            />
          ))
        ) : (
          <EmptyState label="F-Talk" />
        )}
      </Accordion>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  dashboardRoot: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  dashboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  dashboardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  dashboardHeaderText: { flex: 1 },
  dashboardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  dashboardSubtitle: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "MullerMedium",
  },
  loadingWrap: { alignItems: "center", paddingVertical: 30 },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },
  errorCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.16)",
  },
  errorTitle: {
    color: theme.colors.error,
    fontSize: 14,
    fontFamily: "MullerBold",
  },
  errorText: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "MullerMedium",
  },
  accordion: {
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  accordionHeader: {
    minHeight: 64,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  accordionTitleWrap: { flex: 1 },
  accordionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  accordionSubtitle: {
    marginTop: 3,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "MullerMedium",
  },
  accordionBody: {
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  recordCard: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recordNumber: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  recordNumberText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontFamily: "MullerBold",
  },
  recordFields: { flex: 1, gap: 8 },
  recordField: { gap: 2 },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  fieldValue: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  emptyText: {
    paddingVertical: 12,
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },
  generalTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  generalTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  positiveTab: { backgroundColor: theme.colors.successSoft },
  negativeTab: { backgroundColor: theme.colors.errorSoft },
  generalTabText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  positiveText: { color: theme.colors.success },
  negativeText: { color: theme.colors.error },
  generalCount: {
    minWidth: 22,
    textAlign: "center",
    color: theme.colors.text,
    fontSize: 11,
    fontFamily: "MullerBold",
  },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  skillText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  totalCard: {
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  totalValue: {
    color: theme.colors.primary,
    fontSize: 20,
    fontFamily: "MullerBold",
  },
});
