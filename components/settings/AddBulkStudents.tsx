import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert as NativeAlert,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { parse } from "papaparse";
import { supabase } from "@/lib/supabaseClient";
import {
  UploadCloud,
  File,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Download,
  Sparkles,
  RotateCcw,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

const REQUIRED_COLUMNS = [
  "name",
  "cic",
  "class_id",
  "council",
  "batch",
  "phone",
  "guardian",
  "g_phone",
  "address",
  "sslc",
  "plustwo",
  "plustwo_streams",
];

function StatusCard({
  valid,
  missingColumns,
}: {
  valid: boolean;
  missingColumns: string[];
}) {
  return (
    <View
      style={[
        styles.statusCard,
        valid ? styles.statusCardSuccess : styles.statusCardError,
      ]}
    >
      <View style={styles.statusTopRow}>
        {valid ? (
          <ListChecks size={20} color={theme.colors.success} />
        ) : (
          <AlertCircle size={20} color={theme.colors.error} />
        )}

        <Text
          style={[
            styles.statusTitle,
            valid ? styles.statusTitleSuccess : styles.statusTitleError,
          ]}
        >
          {valid ? "Ready to Upload" : "Missing Columns"}
        </Text>
      </View>

      <Text
        style={[
          styles.statusText,
          valid ? styles.statusTextSuccess : styles.statusTextError,
        ]}
      >
        {valid
          ? "All required columns are available."
          : `File is missing: ${missingColumns.join(", ")}`}
      </Text>
    </View>
  );
}

export default function AddBulkStudents() {
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleDownloadTemplate = async () => {
    try {
      const worksheet = XLSX.utils.aoa_to_sheet([REQUIRED_COLUMNS]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

      const wbout = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

      const uri = `${FileSystem.cacheDirectory}Bulk_Student_Template.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri, {
        dialogTitle: "Download Student Template",
      });
    } catch (error) {
      console.error("Template Error:", error);
      NativeAlert.alert("Error", "Failed to generate the template file.");
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      const file = result.assets[0];
      setFileName(file.name);

      const base64Str = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let parsedArray: any[] = [];

      if (file.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(base64Str, { type: "base64" });
        const sheetName = workbook.SheetNames[0];
        parsedArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        const binaryStr = atob(base64Str);
        parsedArray = parse(binaryStr, {
          header: true,
          skipEmptyLines: true,
        }).data as any[];
      }

      if (parsedArray.length > 0) {
        const headers = Object.keys(parsedArray[0]);
        const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

        setMissingColumns(missing);
        setFileData(parsedArray);
        setStep(2);
      } else {
        NativeAlert.alert("Error", "The selected file is empty.");
      }
    } catch (error) {
      console.error(error);
      NativeAlert.alert("Error", "Failed to read the file.");
    }
  };

  const handleUpload = async () => {
    if (!fileData) return;

    setLoading(true);
    setUploadResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("bulk-create-users", {
        body: { students: fileData },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Upload failed");
      }

      setUploadResult(data);
      setStep(3);
    } catch (err: any) {
      NativeAlert.alert("Upload Failed", err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFileData(null);
    setFileName("");
    setMissingColumns([]);
    setUploadResult(null);
  };

  return (
    <View style={styles.rootCard}>
      <View style={styles.topRow}>
        <View style={styles.topIconWrap}>
          <UploadCloud size={22} color={theme.colors.primary} />
        </View>

        <View style={styles.topPill}>
          <Sparkles size={13} color={theme.colors.accent} />
          <Text style={styles.topPillText}>Bulk Add</Text>
        </View>
      </View>

      <Text style={styles.title}>Bulk Add Students</Text>
      <Text style={styles.subtitle}>Upload an XLSX or CSV file.</Text>

      {step === 1 && (
        <View style={styles.stack}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleFileSelect}
            style={styles.uploadDropZone}
          >
            <UploadCloud size={42} color={theme.colors.textMuted} />
            <Text style={styles.uploadDropTitle}>Tap to select a file</Text>
            <Text style={styles.uploadDropText}>XLSX or CSV format</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleDownloadTemplate}
            style={styles.secondaryButton}
          >
            <Download size={17} color={theme.colors.text} />
            <Text style={styles.secondaryButtonText}>Download Excel Template</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stack}>
          <View style={styles.fileCard}>
            <View style={styles.fileIconWrap}>
              <File size={20} color={theme.colors.textMuted} />
            </View>

            <View style={styles.fileTextWrap}>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
              <Text style={styles.fileMeta}>{fileData?.length || 0} rows detected</Text>
            </View>
          </View>

          <StatusCard
            valid={missingColumns.length === 0}
            missingColumns={missingColumns}
          />

          <View style={styles.footerRow}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={reset}
              style={styles.secondaryButton}
            >
              <RotateCcw size={16} color={theme.colors.text} />
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleUpload}
              disabled={missingColumns.length > 0 || loading}
              style={[
                styles.primaryButton,
                (missingColumns.length > 0 || loading) && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.textOnDark} />
              ) : (
                <UploadCloud size={17} color={theme.colors.textOnDark} />
              )}
              <Text style={styles.primaryButtonText}>Upload Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && uploadResult && (
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={52} color={theme.colors.success} />
          </View>

          <Text style={styles.successTitle}>Upload Complete</Text>
          <Text style={styles.successText}>
            <Text style={styles.successStrong}>{uploadResult.createdCount}</Text>{" "}
            students created successfully.
          </Text>

          {uploadResult.failedCount > 0 && (
            <Text style={styles.failText}>
              {uploadResult.failedCount} students failed.
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={reset}
            style={styles.secondaryButtonFull}
          >
            <Text style={styles.secondaryButtonText}>Upload Another File</Text>
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 16,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  stack: {
    gap: 14,
  },
  uploadDropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.borderStrong ?? theme.colors.border,
    borderRadius: 20,
    paddingVertical: 42,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  uploadDropTitle: {
    marginTop: 14,
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  uploadDropText: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  fileCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  fileIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  fileTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  fileMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  statusCardSuccess: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  statusCardError: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  statusTitleSuccess: {
    color: theme.colors.success,
  },
  statusTitleError: {
    color: theme.colors.error,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  statusTextSuccess: {
    color: theme.colors.success,
  },
  statusTextError: {
    color: theme.colors.error,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
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
  secondaryButtonFull: {
    width: "100%",
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  successWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  successIconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  successTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  successText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
  successStrong: {
    color: theme.colors.success,
    fontFamily: "MullerBold",
  },
  failText: {
    marginTop: 8,
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "MullerBold",
    textAlign: "center",
  },
});