import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
} from "react-native";
import { FileDown } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Buffer } from "buffer";
import { theme } from "@/theme/theme";

export interface FoodItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

export interface KitchenStudent {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
}

export interface StudentFoodPreference {
  id: string;
  student_uid: string;
  food_item_id: string;
  is_needed: boolean;
}

interface Props {
  foods: FoodItem[];
  students: KitchenStudent[];
  preferences: StudentFoodPreference[];
  drafts?: Record<string, boolean>;
  selectedFoodId?: string;
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export function FoodSelectionPdfExport({
  foods,
  students,
  preferences,
  drafts = {},
  selectedFoodId,
}: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const activeFoods = [...foods]
        .filter((food) => food.is_active)
        .filter((food) => !selectedFoodId || food.id === selectedFoodId)
        .sort(
          (a, b) =>
            a.display_order - b.display_order || a.name.localeCompare(b.name)
        );

      if (activeFoods.length === 0) {
        Alert.alert("Notice", "Select an active food to export.");
        return;
      }

      const foodSections = activeFoods
        .map((food) => {
          const rows = [...students]
            .filter((student) => {
              const key = `${student.student_uid}-${food.id}`;
              const savedValue = preferences.find(
                (pref) =>
                  pref.student_uid === student.student_uid &&
                  pref.food_item_id === food.id
              )?.is_needed;

              return (drafts[key] ?? savedValue ?? true) === false;
            })
            .map((student) => ({
              name: student.name,
              class_id: student.class_id || "Unassigned",
              cic: student.cic || "",
            }))
            .sort((a, b) => {
              const classCmp = a.class_id.localeCompare(b.class_id, undefined, {
                numeric: true,
                sensitivity: "base",
              });
              if (classCmp !== 0) return classCmp;

              const cicCmp = a.cic.localeCompare(b.cic, undefined, {
                numeric: true,
                sensitivity: "base",
              });
              if (cicCmp !== 0) return cicCmp;

              return a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base",
              });
            });

          return { foodName: food.name, rows };
        })
        .filter((section) => section.rows.length > 0);

      if (foodSections.length === 0) {
        Alert.alert("Notice", "No students found for this food export.");
        return;
      }

      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 28;
      const bottomLimit = 28;
      const contentWidth = pageWidth - margin * 2;

      const colors = {
        text: rgb(0.08, 0.13, 0.2),
        muted: rgb(0.38, 0.44, 0.52),
        border: rgb(0.87, 0.9, 0.94),
        borderStrong: rgb(0.81, 0.84, 0.88),
        softFill: rgb(0.965, 0.973, 0.988),
        headerFill: rgb(0.933, 0.949, 0.969),
      };

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let pageNumber = 1;
      let y = pageHeight - margin;

      const drawText = (
        text: string,
        x: number,
        yPos: number,
        size = 10,
        font = fontRegular,
        color = colors.text
      ) => {
        page.drawText(text, { x, y: yPos, size, font, color });
      };

      const drawRect = (
        x: number,
        yPos: number,
        width: number,
        height: number,
        fillColor?: ReturnType<typeof rgb>,
        borderColor?: ReturnType<typeof rgb>,
        borderWidth = 1
      ) => {
        page.drawRectangle({
          x,
          y: yPos,
          width,
          height,
          color: fillColor,
          borderColor,
          borderWidth,
        });
      };

      const drawPageHeader = () => {
        drawText("Students Not Needing Food", margin, y, 18, fontBold);
        y -= 16;
        drawText("Class-wise food preference report", margin, y, 9, fontRegular, colors.muted);
        y -= 24;
      };

      const drawPageFooter = () => {
        drawText(`Page ${pageNumber}`, pageWidth - margin - 35, 14, 8, fontRegular, colors.muted);
      };

      const addNewPage = () => {
        drawPageFooter();
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageNumber += 1;
        y = pageHeight - margin;
        drawPageHeader();
      };

      const ensureSpace = (neededHeight: number) => {
        if (y - neededHeight < bottomLimit) addNewPage();
      };

      drawPageHeader();

      foodSections.forEach((section) => {
        ensureSpace(34);
        drawRect(margin, y - 24, contentWidth, 24, colors.softFill, colors.borderStrong, 1);
        drawText(section.foodName, margin + 8, y - 16, 12, fontBold);
        drawText(`${section.rows.length} students`, pageWidth - margin - 82, y - 16, 9, fontRegular, colors.muted);
        y -= 32;

        let currentClass = "";
        let classIndex = 0;

        section.rows.forEach((row) => {
          const isNewClass = row.class_id !== currentClass;
          ensureSpace(isNewClass ? 40 : 18);

          if (isNewClass) {
            currentClass = row.class_id;
            classIndex = 0;
            drawRect(margin, y - 18, contentWidth, 18, colors.headerFill, colors.border, 1);
            drawText(currentClass, margin + 8, y - 12, 9.5, fontBold);
            y -= 22;
          }

          classIndex += 1;
          const studentLine = row.cic
            ? `${classIndex}. ${row.name} (${row.cic})`
            : `${classIndex}. ${row.name}`;

          drawText(truncateText(studentLine, 82), margin + 12, y - 11, 8.5);
          y -= 17;
        });

        y -= 10;
      });

      drawPageFooter();

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
        return;
      }

      const pdfBytes = await pdfDoc.save();
      const fileUri = `${FileSystem.cacheDirectory}Food_Selection_Report.pdf`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        Buffer.from(pdfBytes).toString("base64"),
        { encoding: FileSystem.EncodingType.Base64 }
      );

      await Sharing.shareAsync(fileUri, {
        dialogTitle: "Export Food Report",
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      Alert.alert("Export Failed", err.message || "Could not export report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, exporting && styles.btnDisabled]}
      onPress={handleExport}
      activeOpacity={0.84}
      disabled={exporting}
    >
      <View style={styles.btnIconWrap}>
        {exporting ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <FileDown size={18} color={theme.colors.primary} />
        )}
      </View>

      <Text style={styles.btnText}>
        {exporting ? "Exporting..." : "Export Foods PDF"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    minHeight: 48,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  btnDisabled: {
    opacity: 0.72,
  },
  btnIconWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: theme.colors.textSecondary,
    fontFamily: "MullerBold",
    fontSize: 14,
    lineHeight: 18,
  },
});
