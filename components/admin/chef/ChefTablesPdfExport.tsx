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
import { theme } from "@/theme/theme";
import { Buffer } from "buffer";

interface KitchenTable {
  id: string;
  table_number: number;
  table_name: string | null;
  is_active: boolean;
  row_number: number;
  row_position: "left" | "middle" | "right";
  orientation: "horizontal" | "vertical";
  active_seat_count: number;
  display_order: number;
}

interface KitchenStudent {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
  council: string | null;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

interface SeatAssignment {
  id: string;
  student_uid: string;
  kitchen_table_id: string;
  seat_number: number;
}

interface ChefTablesPdfExportProps {
  tables: KitchenTable[];
  students: KitchenStudent[];
  assignments: SeatAssignment[];
}

interface TableStudentRow {
  seat_number: number;
  name: string;
  cic: string;
  class_id: string;
}

function truncateText(text: string, maxLength: number) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function ChefTablesPdfExport({
  tables,
  students,
  assignments,
}: ChefTablesPdfExportProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const activeTables = [...tables]
        .filter((table) => table.is_active)
        .sort((a, b) => {
          if (a.row_number !== b.row_number) return a.row_number - b.row_number;
          if (a.display_order !== b.display_order) return a.display_order - b.display_order;
          return a.table_number - b.table_number;
        });

      if (activeTables.length === 0) {
        Alert.alert("Notice", "No active tables to export.");
        return;
      }

      const studentMap = new Map(
        students.map((student) => [student.student_uid, student])
      );

      const tableData = activeTables.map((table) => {
        const rows: TableStudentRow[] = assignments
          .filter((assignment) => assignment.kitchen_table_id === table.id)
          .sort((a, b) => a.seat_number - b.seat_number)
          .map((assignment) => {
            const student = studentMap.get(assignment.student_uid);

            return {
              seat_number: assignment.seat_number,
              name: student?.name || "Unknown",
              cic: student?.cic || "—",
              class_id: student?.class_id || "—",
            };
          });

        return { table, rows };
      });

      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      const pageWidth = 595.28; // A4 portrait width in points
      const pageHeight = 841.89; // A4 portrait height in points
      const margin = 28;
      const bottomLimit = 30;

      const contentWidth = pageWidth - margin * 2;

      const colSeat = 50;
      const colName = 220;
      const colCic = 100;
      const colClass = contentWidth - colSeat - colName - colCic;

      const colors = {
        text: rgb(0.08, 0.13, 0.2),
        muted: rgb(0.38, 0.44, 0.52),
        border: rgb(0.87, 0.9, 0.94),
        borderStrong: rgb(0.81, 0.84, 0.88),
        softFill: rgb(0.965, 0.973, 0.988),
        headerFill: rgb(0.933, 0.949, 0.969),
        zebra: rgb(0.98, 0.984, 0.992),
      };

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      let pageNumber = 1;

      const drawText = (
        text: string,
        x: number,
        yPos: number,
        size = 10,
        font = fontRegular,
        color = colors.text
      ) => {
        page.drawText(text, {
          x,
          y: yPos,
          size,
          font,
          color,
        });
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

      const drawPageFooter = () => {
        drawText(`Page ${pageNumber}`, pageWidth - margin - 38, 12, 8, fontRegular, colors.muted);
      };

      const drawPageHeader = (isFirstPage = false) => {
        y = pageHeight - margin;

        if (isFirstPage) {
          drawText("Chef Table Full Report", margin, y, 18, fontBold, colors.text);
          y -= 18;
          drawText(`Active Tables: ${tableData.length}`, margin, y, 9, fontRegular, colors.muted);
          drawText("Generated from mobile export", pageWidth - margin - 120, y, 9, fontRegular, colors.muted);
          y -= 22;
        } else {
          drawText("Chef Table Full Report", margin, y, 14, fontBold, colors.text);
          y -= 18;
        }
      };

      const startNewPage = () => {
        drawPageFooter();
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageNumber += 1;
        drawPageHeader(false);
      };

      const ensureSpace = (neededHeight: number) => {
        if (y - neededHeight < bottomLimit) {
          startNewPage();
        }
      };

      const drawTableSectionHeader = (title: string, totalStudents: number) => {
        const boxHeight = 22;
        ensureSpace(boxHeight + 8);

        drawRect(
          margin,
          y - boxHeight,
          contentWidth,
          boxHeight,
          colors.softFill,
          colors.borderStrong,
          1
        );

        drawText(title, margin + 8, y - 14, 11, fontBold, colors.text);
        drawText(
          `Total Students: ${totalStudents}`,
          pageWidth - margin - 105,
          y - 14,
          9,
          fontRegular,
          colors.muted
        );

        y -= boxHeight + 8;
      };

      const drawTableColumnHeader = () => {
        const rowHeight = 18;
        ensureSpace(rowHeight);

        drawRect(
          margin,
          y - rowHeight,
          contentWidth,
          rowHeight,
          colors.headerFill,
          colors.borderStrong,
          1
        );

        let x = margin;
        drawText("Seat", x + 6, y - 12, 9, fontBold);
        x += colSeat;

        drawText("Name", x + 6, y - 12, 9, fontBold);
        x += colName;

        drawText("CIC", x + 6, y - 12, 9, fontBold);
        x += colCic;

        drawText("Class", x + 6, y - 12, 9, fontBold);

        y -= rowHeight;
      };

      const drawStudentRow = (row: TableStudentRow, index: number) => {
        const rowHeight = 18;
        ensureSpace(rowHeight);

        const fill = index % 2 === 0 ? colors.zebra : undefined;

        drawRect(
          margin,
          y - rowHeight,
          contentWidth,
          rowHeight,
          fill,
          colors.border,
          1
        );

        let x = margin;
        drawText(String(row.seat_number), x + 6, y - 12, 8.5, fontRegular);
        x += colSeat;

        drawText(truncateText(row.name, 34), x + 6, y - 12, 8.5, fontRegular);
        x += colName;

        drawText(truncateText(row.cic, 14), x + 6, y - 12, 8.5, fontRegular);
        x += colCic;

        drawText(truncateText(row.class_id, 18), x + 6, y - 12, 8.5, fontRegular);

        y -= rowHeight;
      };

      drawPageHeader(true);

      tableData.forEach((item, tableIndex) => {
        const tableTitle = item.table.table_name || `Table ${item.table.table_number}`;

        drawTableSectionHeader(tableTitle, item.rows.length);
        drawTableColumnHeader();

        if (item.rows.length === 0) {
          const rowHeight = 18;
          ensureSpace(rowHeight);

          drawRect(
            margin,
            y - rowHeight,
            contentWidth,
            rowHeight,
            undefined,
            colors.border,
            1
          );

          drawText("No students assigned", margin + 6, y - 12, 8.5, fontItalic, colors.muted);
          y -= rowHeight + 8;
        } else {
          item.rows.forEach((row, rowIndex) => {
            if (y - 18 < bottomLimit) {
              startNewPage();
              drawTableSectionHeader(`${tableTitle} (continued)`, item.rows.length);
              drawTableColumnHeader();
            }
            drawStudentRow(row, rowIndex);
          });

          y -= 10;
        }

        if (tableIndex !== tableData.length - 1) {
          ensureSpace(8);
        }
      });

      drawPageFooter();

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
        return;
      }

      const pdfBytes = await pdfDoc.save();
      const fileUri = `${FileSystem.cacheDirectory}Chef_Table_Report.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, Buffer.from(pdfBytes).toString("base64"), {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri, {
        dialogTitle: "Export Chef Report",
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } catch (e: any) {
      Alert.alert("Export Failed", e.message || "Could not export PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleExportPdf}
      style={[styles.btn, exporting && styles.btnDisabled]}
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
        {exporting ? "Exporting..." : "Export PDF"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
    color: theme.colors.primary,
  },
});