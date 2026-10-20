import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface CbcssRecordPdf {
  id: string;
  batch: string;
  semester: string;
  course_type: "OFF COURSE" | "IN COURSE";
  course_name: string;
  instead_of: string;
  credits: number;
}

export interface CbcssStudentPdf {
  id?: string;
  record_id: string;
  student_uid: string;
  student_name: string;
  cic?: string | null;
}

export interface ExportCbcssPdfParams {
  className: string;
  semester: string;
  records: CbcssRecordPdf[];
  recordStudents: CbcssStudentPdf[];
}

export async function exportCbcssPdf({
  className,
  semester,
  records,
  recordStudents,
}: ExportCbcssPdfParams): Promise<void> {
  const semLabel = semester === "SEM-1" ? "Semester 1 (SEM-1)" : "Semester 2 (SEM-2)";
  const now = new Date();
  const generatedAt = `${now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const totalCourses = records.length;
  const inCourses = records.filter((r) => r.course_type === "IN COURSE").length;
  const offCourses = records.filter((r) => r.course_type === "OFF COURSE").length;
  const totalCredits = records.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);

  // Group students by record_id
  const studentsByRecord: Record<string, CbcssStudentPdf[]> = {};
  recordStudents.forEach((s) => {
    if (!studentsByRecord[s.record_id]) studentsByRecord[s.record_id] = [];
    studentsByRecord[s.record_id].push(s);
  });

  const cardsHtml = records
    .map((rec, idx) => {
      const students = studentsByRecord[rec.id] || [];
      const isOff = rec.course_type === "OFF COURSE";
      const badgeClass = isOff ? "badge-off" : "badge-in";

      const studentChips = students.length
        ? students
            .map(
              (s) =>
                `<span class="student-chip">${escapeHtml(s.student_name)}${
                  s.cic ? ` <small>(${escapeHtml(s.cic)})</small>` : ""
                }</span>`
            )
            .join(" ")
        : `<span style="color: #94A3B8; font-style: italic;">No students enrolled</span>`;

      return `
      <div class="course-card">
        <div class="course-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="course-number">#${idx + 1}</span>
            <span class="badge ${badgeClass}">${escapeHtml(rec.course_type)}</span>
            <span class="course-title">${escapeHtml(rec.course_name)}</span>
          </div>
          <div class="credits-badge">${rec.credits} Credits</div>
        </div>

        <div class="course-body">
          <div class="instead-of-box">
            <span class="instead-label">Instead of (Replaced Subject):</span>
            <span class="instead-value">${escapeHtml(rec.instead_of)}</span>
          </div>

          <div style="margin-top: 10px;">
            <div class="students-label">Enrolled Students (${students.length}):</div>
            <div class="chip-container">${studentChips}</div>
          </div>
        </div>
      </div>
      `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CBCSS Report - ${escapeHtml(className)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.5;
    }
    .header-banner {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);
      color: #FFFFFF;
      padding: 22px 24px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .college-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #F8FAFC;
    }
    .report-title {
      font-size: 14px;
      font-weight: 700;
      color: #A5B4FC;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .header-meta {
      font-size: 11px;
      color: #C7D2FE;
      margin-top: 6px;
    }
    .header-right {
      text-align: right;
    }
    .class-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .timestamp {
      font-size: 10px;
      color: #94A3B8;
      margin-top: 8px;
    }

    /* KPI CARDS */
    .kpi-row {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-top: 2px;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .badge-in { background: #DBEAFE; color: #1D4ED8; }
    .badge-off { background: #FEF3C7; color: #B45309; }

    /* COURSE CARDS */
    .course-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      overflow: hidden;
    }
    .course-header {
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .course-number {
      background: #4338CA;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .course-title {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
    }
    .credits-badge {
      font-size: 11px;
      font-weight: 700;
      color: #4338CA;
      background: #EEF2FF;
      padding: 3px 9px;
      border-radius: 6px;
    }
    .course-body {
      padding: 12px 14px;
    }
    .instead-of-box {
      background: #F1F5F9;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 11px;
    }
    .instead-label {
      color: #64748B;
      font-weight: 600;
    }
    .instead-value {
      color: #0F172A;
      font-weight: 700;
      margin-left: 4px;
    }
    .students-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #475569;
      margin-bottom: 6px;
    }
    .chip-container {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .student-chip {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      color: #3730A3;
    }

    /* SIGNATURES */
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .signature-block {
      text-align: center;
      width: 180px;
    }
    .signature-line {
      border-top: 1px dashed #64748B;
      margin-bottom: 6px;
    }
    .signature-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .footer-note {
      text-align: center;
      margin-top: 24px;
      font-size: 9px;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-banner">
    <div>
      <div class="college-name">PMSA Wafy Arts & Islamic College</div>
      <div class="report-title">Choice Based Credit Semester System (CBCSS)</div>
      <div class="header-meta">Course Allocation & Student Enrollment Record</div>
    </div>
    <div class="header-right">
      <div class="class-badge">${escapeHtml(className)} • ${escapeHtml(semLabel)}</div>
      <div class="timestamp">Generated: ${escapeHtml(generatedAt)}</div>
    </div>
  </div>

  <!-- KPI SUMMARY -->
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-value">${totalCourses}</div>
      <div class="kpi-label">Total CBCSS Courses</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #2563EB;">${inCourses}</div>
      <div class="kpi-label">In Course</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #D97706;">${offCourses}</div>
      <div class="kpi-label">Off Course</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #4338CA;">${totalCredits}</div>
      <div class="kpi-label">Total Credits</div>
    </div>
  </div>

  <!-- COURSES LIST -->
  <div style="margin-bottom: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1E293B;">
    Allocated CBCSS Courses
  </div>

  ${cardsHtml || `<div style="text-align: center; color: #94A3B8; padding: 24px; background: #F8FAFC; border-radius: 10px;">No CBCSS courses recorded for ${escapeHtml(semLabel)}.</div>`}

  <!-- SIGNATURES -->
  <div class="signatures-row">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">Class Teacher</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">CBCSS Coordinator</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">Principal / Officer</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer-note">
    Confidential PMSA Wafy College Academic Record • Generated electronically on ${escapeHtml(
      generatedAt
    )}
  </div>

</body>
</html>
  `;

  const { uri } = await Print.printToFileAsync({
    html,
    margins: { left: 20, top: 20, right: 20, bottom: 20 },
  });

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `Download CBCSS Report - ${className} (${semester})`,
    UTI: "com.adobe.pdf",
  });
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
