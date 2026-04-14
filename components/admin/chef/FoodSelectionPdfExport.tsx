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
}

export function FoodSelectionPdfExport({
  foods,
  students,
  preferences,
}: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const activeFoods = [...foods]
        .filter((f) => f.is_active)
        .sort(
          (a, b) =>
            a.display_order - b.display_order || a.name.localeCompare(b.name)
        );

      const studentMap = new Map(
        students.map((s) => [s.student_uid, s] as const)
      );

      const foodSections = activeFoods
        .map((food) => {
          const excludedStudents = preferences
            .filter((p) => p.food_item_id === food.id && p.is_needed === false)
            .map((p) => studentMap.get(p.student_uid))
            .filter(Boolean)
            .map((s) => ({
              name: s!.name,
              class_id: s!.class_id,
              cic: s!.cic || "",
            }))
            .sort((a, b) => {
              const classCmp = a.class_id.localeCompare(b.class_id, undefined, {
                numeric: true,
                sensitivity: "base",
              });
              if (classCmp !== 0) return classCmp;

              return a.cic.localeCompare(b.cic, undefined, {
                numeric: true,
                sensitivity: "base",
              });
            });

          return {
            foodName: food.name,
            rows: excludedStudents,
          };
        })
        .filter((section) => section.rows.length > 0);

      if (foodSections.length === 0) {
        Alert.alert("Notice", "No food preference exclusions found to export.");
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
      const columnGap = 10;
      const columnWidth = (contentWidth - columnGap * 2) / 3;

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

      const headerStartY = pageHeight - margin;
      const usableTop = pageHeight - 78;

      let currentColumn = 0;
      let yPositions = [usableTop, usableTop, usableTop];

      const drawText = (
        text: string,
        x: number,
        y: number,
        size = 10,
        font = fontRegular,
        color = colors.text
      ) => {
        page.drawText(text, { x, y, size, font, color });
      };

      const drawRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        fillColor?: ReturnType<typeof rgb>,
        borderColor?: ReturnType<typeof rgb>,
        borderWidth = 1
      ) => {
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: fillColor,
          borderColor,
          borderWidth,
        });
      };

      const drawPageHeader = () => {
        drawText(
          "Students Not Needing Foods",
          margin,
          headerStartY,
          18,
          fontBold,
          colors.text
        );
        drawText(
          "Grouped by food item • Class-wise readable summary",
          margin,
          headerStartY - 16,
          9,
          fontRegular,
          colors.muted
        );
      };

      const drawPageFooter = () => {
        drawText(
          `Page ${pageNumber}`,
          pageWidth - margin - 35,
          14,
          8,
          fontRegular,
          colors.muted
        );
      };

      const addNewPage = () => {
        drawPageFooter();
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageNumber += 1;
        currentColumn = 0;
        yPositions = [usableTop, usableTop, usableTop];
        drawPageHeader();
      };

      const getColumnX = (index: number) =>
        margin + index * (columnWidth + columnGap);

      const ensureColumnSpace = (neededHeight: number) => {
        while (yPositions[currentColumn] - neededHeight < bottomLimit) {
          if (currentColumn < 2) {
            currentColumn += 1;
          } else {
            addNewPage();
          }
        }
      };

      drawPageHeader();

      foodSections.forEach((section) => {
        ensureColumnSpace(26);

        let x = getColumnX(currentColumn);
        let y = yPositions[currentColumn];

        drawRect(
          x,
          y - 20,
          columnWidth,
          20,
          colors.softFill,
          colors.borderStrong,
          1
        );
        drawText(section.foodName, x + 8, y - 13, 10, fontBold, colors.text);

        y -= 26;
        let currentClass = "";

        section.rows.forEach((row) => {
          const isNewClass = row.class_id !== currentClass;
          const neededHeight = isNewClass ? 20 : 12;

          ensureColumnSpace(neededHeight);

          x = getColumnX(currentColumn);
          y = yPositions[currentColumn];

          if (isNewClass) {
            currentClass = row.class_id;

            drawRect(
              x,
              y - 14,
              columnWidth,
              14,
              colors.headerFill,
              colors.border,
              1
            );
            drawText(currentClass, x + 6, y - 9, 8.5, fontBold, colors.text);
            y -= 18;
          }

          const studentLine = row.cic
            ? `• ${row.name} (${row.cic})`
            : `• ${row.name}`;

          drawText(studentLine, x + 8, y - 7, 7.5, fontRegular, colors.text);
          y -= 12;

          yPositions[currentColumn] = y;
        });

        yPositions[currentColumn] -= 8;
      });

      drawPageFooter();

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert(
          "Sharing Unavailable",
          "Sharing is not available on this device."
        );
        return;
      }

      const pdfBytes = await pdfDoc.save();
      const fileUri = `${FileSystem.cacheDirectory}Food_Selection_Report.pdf`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        Buffer.from(pdfBytes).toString("base64"),
        {
          encoding: FileSystem.EncodingType.Base64,
        }
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