import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert as NativeAlert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  User,
  GraduationCap,
  Phone,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";

const initialFormData = {
  name: "",
  cic: "",
  class_id: "TH-1",
  council: "",
  batch: "",
  phone: "",
  guardian: "",
  g_phone: "",
  address: "",
  sslc: "",
  plustwo: "",
  plustwo_streams: "",
};

const classOptions = [
  "TH-1",
  "TH-2",
  "AL-1",
  "AL-2",
  "AL-3",
  "AL-4",
  "Foundation A",
  "Foundation B",
];

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function ReviewCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewTitle}>{title}</Text>

      <View style={styles.reviewStack}>
        {rows.map((row) => (
          <View key={row.label} style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{row.label}</Text>
            <Text style={styles.reviewValue}>{row.value || "N/A"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AddStudents() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep((prev) => (prev < 4 ? prev + 1 : prev));
  const prevStep = () => setStep((prev) => (prev > 1 ? prev - 1 : prev));

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const cic = formData.cic.trim().toLowerCase();
      const email = `${cic}@pmsa.com`;
      const password = `${cic}@11`;

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { ...formData, email, password },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error);
      }

      NativeAlert.alert("Success", "Student added successfully!");
      setStep(1);
      setFormData(initialFormData);
    } catch (err: any) {
      NativeAlert.alert("Failed to add student", err.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = useMemo<`${number}%`>(() => `${(step / 4) * 100}%`, [step]);

  return (
    <View style={styles.rootCard}>
      <View style={styles.topRow}>
        <View style={styles.topIconWrap}>
          <User size={22} color={theme.colors.primary} />
        </View>

        <View style={styles.topPill}>
          <Sparkles size={13} color={theme.colors.accent} />
          <Text style={styles.topPillText}>Manual Add</Text>
        </View>
      </View>

      <Text style={styles.title}>Add Student</Text>
      <Text style={styles.subtitle}>Create one student profile step by step.</Text>

      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Step {step} of 4</Text>
          <Text style={styles.progressHint}>
            {step === 1
              ? "Personal"
              : step === 2
              ? "Academic"
              : step === 3
              ? "Contact"
              : "Review"}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progress }]} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {step === 1 && (
          <View>
            <SectionTitle
              title="Personal Information"
              subtitle="Basic identity and previous study details."
            />

            <InputField
              label="Full Name"
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              placeholder="e.g. Mohammed Shuhaib M"
            />

            <InputField
              label="CIC Number"
              value={formData.cic}
              onChangeText={(t) => setFormData({ ...formData, cic: t })}
              placeholder="e.g. 16828"
              keyboardType="numeric"
            />

            <InputField
              label="SSLC Board"
              value={formData.sslc}
              onChangeText={(t) => setFormData({ ...formData, sslc: t })}
              placeholder="e.g. Kerala State Board"
            />

            <InputField
              label="+2 Board"
              value={formData.plustwo}
              onChangeText={(t) => setFormData({ ...formData, plustwo: t })}
              placeholder="e.g. Kerala State Board"
            />

            <InputField
              label="+2 Stream"
              value={formData.plustwo_streams}
              onChangeText={(t) =>
                setFormData({ ...formData, plustwo_streams: t })
              }
              placeholder="e.g. Science / Commerce"
            />
          </View>
        )}

        {step === 2 && (
          <View>
            <SectionTitle
              title="Academic Placement"
              subtitle="Assign the student to class, batch, and council."
            />

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Class ID</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={formData.class_id}
                  onValueChange={(v) => setFormData({ ...formData, class_id: v })}
                  style={{ color: theme.colors.text }}
                >
                  {classOptions.map((opt) => (
                    <Picker.Item
                      key={opt}
                      label={opt}
                      value={opt}
                      color={theme.colors.text}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <InputField
              label="Council"
              value={formData.council}
              onChangeText={(t) => setFormData({ ...formData, council: t })}
              placeholder="e.g. INSHIRAH"
            />

            <InputField
              label="Batch"
              value={formData.batch}
              onChangeText={(t) => setFormData({ ...formData, batch: t })}
              placeholder="e.g. Batch 12"
            />
          </View>
        )}

        {step === 3 && (
          <View>
            <SectionTitle
              title="Contact Information"
              subtitle="Student, guardian, and address details."
            />

            <InputField
              label="Student Phone"
              value={formData.phone}
              onChangeText={(t) => setFormData({ ...formData, phone: t })}
              placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad"
            />

            <InputField
              label="Guardian Name"
              value={formData.guardian}
              onChangeText={(t) => setFormData({ ...formData, guardian: t })}
              placeholder="Guardian Name"
            />

            <InputField
              label="Guardian Phone"
              value={formData.g_phone}
              onChangeText={(t) => setFormData({ ...formData, g_phone: t })}
              placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad"
            />

            <InputField
              label="Address"
              value={formData.address}
              onChangeText={(t) => setFormData({ ...formData, address: t })}
              placeholder="Full address"
              multiline
            />
          </View>
        )}

        {step === 4 && (
          <View>
            <SectionTitle
              title="Review & Submit"
              subtitle="Check the details before creating the account."
            />

            <View style={styles.reviewStackMain}>
              <ReviewCard
                title="Personal"
                rows={[
                  { label: "Name", value: formData.name },
                  { label: "CIC", value: formData.cic },
                  { label: "SSLC", value: formData.sslc },
                  { label: "+2", value: formData.plustwo },
                  { label: "+2 Stream", value: formData.plustwo_streams },
                ]}
              />

              <ReviewCard
                title="Academic"
                rows={[
                  { label: "Class", value: formData.class_id },
                  { label: "Batch", value: formData.batch },
                  { label: "Council", value: formData.council },
                ]}
              />

              <ReviewCard
                title="Contact"
                rows={[
                  { label: "Phone", value: formData.phone },
                  { label: "Guardian", value: formData.guardian },
                  { label: "Guardian Phone", value: formData.g_phone },
                  { label: "Address", value: formData.address },
                ]}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footerRow}>
        {step > 1 ? (
          <TouchableOpacity
            onPress={prevStep}
            activeOpacity={0.84}
            style={styles.secondaryButton}
          >
            <ChevronLeft size={17} color={theme.colors.text} />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerSpacer} />
        )}

        {step < 4 ? (
          <TouchableOpacity
            onPress={nextStep}
            activeOpacity={0.86}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <ChevronRight size={17} color={theme.colors.textOnDark} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.86}
            style={[styles.successButton, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.textOnDark} />
            ) : (
              <CheckCircle2 size={17} color={theme.colors.textOnDark} />
            )}
            <Text style={styles.successButtonText}>Confirm & Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  topPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  progressWrap: {
    marginTop: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  progressHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  sectionSubtitle: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  textarea: {
    minHeight: 100,
    paddingTop: 14,
    paddingBottom: 14,
  },
  pickerWrap: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },
  reviewStackMain: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 14,
  },
  reviewTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
    marginBottom: 10,
  },
  reviewStack: {
    gap: 8,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    flex: 1,
  },
  reviewValue: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerBold",
    flex: 1,
    textAlign: "right",
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerSpacer: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  successButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  successButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});