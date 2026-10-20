import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { displayDate } from "@/lib/portionUtils";

export interface CeWorkItemPdf {
  id: string;
  batch: string;
  semester?: string;
  work_name: string;
  subject_name: string;
  teacher_name?: string | null;
  started_date: string;
  submission_date: string;
  mark?: number | null;
}

export interface CeWorkStudentPdf {
  id?: string;
  work_id: string;
  student_uid: string;
  student_name: string;
  cic?: string | null;
  is_submitted: boolean;
}

export interface ExportCeWorkPdfParams {
  className: string;
  semester: string;
  works: CeWorkItemPdf[];
  workStudents: CeWorkStudentPdf[];
}

export async function exportCeWorkPdf({
  className,
  semester,
  works,
  workStudents,
}: ExportCeWorkPdfParams): Promise<void> {
  const semLabel = semester === "SEM-1" ? "Semester 1 (SEM-1)" : "Semester 2 (SEM-2)";
  const now = new Date();
  const generatedAt = `${now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const totalWorks = works.length;
  let totalSubmitted = 0;
  let totalPending = 0;

  workStudents.forEach((ws) => {
    if (ws.is_submitted) totalSubmitted++;
    else totalPending++;
  });

  const totalPossible = totalSubmitted + totalPending;
  const completionRate =
    totalPossible > 0 ? ((totalSubmitted / totalPossible) * 100).toFixed(1) : "0.0";

  // Group student rows by work_id
  const rowsByWork: Record<string, CeWorkStudentPdf[]> = {};
  workStudents.forEach((ws) => {
    if (!rowsByWork[ws.work_id]) rowsByWork[ws.work_id] = [];
    rowsByWork[ws.work_id].push(ws);
  });

  // Table rows for Works
  const worksTableHtml = works
    .map((w, idx) => {
      const rows = rowsByWork[w.id] || [];
      const submittedCount = rows.filter((r) => r.is_submitted).length;
      const totalCount = rows.length;
      const percent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
      const statusBadge =
        percent === 100
          ? `<span class="badge badge-success">Completed</span>`
          : percent > 50
          ? `<span class="badge badge-info">${percent}% Done</span>`
          : `<span class="badge badge-warning">${percent}% Done</span>`;

      return `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td>
          <div class="work-name">${escapeHtml(w.work_name)}</div>
          <div class="sub-text">${escapeHtml(w.subject_name)}</div>
        </td>
        <td>${escapeHtml(w.teacher_name || "—")}</td>
        <td style="text-align: center; font-weight: 600;">${w.mark ?? "—"}</td>
        <td style="white-space: nowrap; font-size: 11px;">
          <div><span style="color: #64748B;">Start:</span> ${displayDate(w.started_date)}</div>
          <div><span style="color: #64748B;">Due:</span> ${displayDate(w.submission_date)}</div>
        </td>
        <td style="text-align: center;">
          <div style="font-weight: 700; font-size: 13px;">${submittedCount} / ${totalCount}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%;"></div>
          </div>
        </td>
        <td style="text-align: center;">${statusBadge}</td>
      </tr>
      `;
    })
    .join("");

  // Detailed breakdowns for each work
  const detailedSectionsHtml = works
    .map((w, idx) => {
      const rows = rowsByWork[w.id] || [];
      const submitted = rows.filter((r) => r.is_submitted);
      const pending = rows.filter((r) => !r.is_submitted);

      const submittedBadges = submitted.length
        ? submitted
            .map(
              (s) =>
                `<span class="student-chip chip-submitted">${escapeHtml(s.student_name)}${
                  s.cic ? ` <small>(${escapeHtml(s.cic)})</small>` : ""
                }</span>`
            )
            .join(" ")
        : `<span style="color: #94A3B8; font-style: italic;">None yet</span>`;

      const pendingBadges = pending.length
        ? pending
            .map(
              (s) =>
                `<span class="student-chip chip-pending">${escapeHtml(s.student_name)}${
                  s.cic ? ` <small>(${escapeHtml(s.cic)})</small>` : ""
                }</span>`
            )
            .join(" ")
        : `<span style="color: #16A34A; font-weight: 600;">All students submitted</span>`;

      return `
      <div class="detail-card">
        <div class="detail-header">
          <div>
            <span class="detail-number">#${idx + 1}</span>
            <span class="detail-title">${escapeHtml(w.work_name)}</span>
            <span class="detail-subject">• ${escapeHtml(w.subject_name)}</span>
            ${w.teacher_name ? `<span class="detail-teacher">(${escapeHtml(w.teacher_name)})</span>` : ""}
          </div>
          <div class="detail-meta">
            ${w.mark ? `<span class="badge badge-primary">${w.mark} Marks</span>` : ""}
            <span class="due-badge">Due: ${displayDate(w.submission_date)}</span>
          </div>
        </div>

        <div class="detail-body">
          <div class="submission-group">
            <div class="group-title submitted-title">
              ✓ Submitted Students (${submitted.length})
            </div>
            <div class="chip-container">${submittedBadges}</div>
          </div>

          <div class="submission-group" style="margin-top: 10px;">
            <div class="group-title pending-title">
              ✕ Pending Students (${pending.length})
            </div>
            <div class="chip-container">${pendingBadges}</div>
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
  <title>CE Work Report - ${escapeHtml(className)}</title>
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
      background: linear-gradient(135deg, #0A2540 0%, #1E3A8A 100%);
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
      color: #60A5FA;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .header-meta {
      font-size: 11px;
      color: #CBD5E1;
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

    /* SECTION TITLES */
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1E293B;
      margin: 18px 0 10px 0;
      border-left: 4px solid #2563EB;
      padding-left: 8px;
    }

    /* MASTER TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11px;
    }
    th {
      background: #F1F5F9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 9px 10px;
      border-bottom: 2px solid #CBD5E1;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: 9px 10px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #FBFCFD;
    }
    .work-name {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
    }
    .sub-text {
      font-size: 10px;
      color: #64748B;
      font-weight: 500;
    }
    .progress-bar {
      width: 80px;
      height: 6px;
      background: #E2E8F0;
      border-radius: 99px;
      overflow: hidden;
      margin: 4px auto 0 auto;
    }
    .progress-fill {
      height: 100%;
      background: #16A34A;
      border-radius: 99px;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-success { background: #DCFCE7; color: #15803D; }
    .badge-info { background: #E0E7FF; color: #4338CA; }
    .badge-warning { background: #FEF3C7; color: #B45309; }
    .badge-primary { background: #DBEAFE; color: #1D4ED8; }

    /* DETAIL CARDS */
    .detail-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      overflow: hidden;
    }
    .detail-header {
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .detail-number {
      display: inline-block;
      background: #2563EB;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
      margin-right: 6px;
    }
    .detail-title {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
    }
    .detail-subject {
      font-size: 12px;
      color: #475569;
      font-weight: 600;
      margin-left: 4px;
    }
    .detail-teacher {
      font-size: 11px;
      color: #64748B;
      font-style: italic;
      margin-left: 4px;
    }
    .due-badge {
      font-size: 11px;
      font-weight: 600;
      color: #0369A1;
      background: #E0F2FE;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .detail-body {
      padding: 12px 14px;
    }
    .group-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 6px;
    }
    .submitted-title { color: #15803D; }
    .pending-title { color: #DC2626; }
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
    }
    .chip-submitted {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      color: #166534;
    }
    .chip-pending {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #991B1B;
    }

    /* FOOTER & SIGNATURES */
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
      <div class="report-title">Continuous Evaluation (CE) Report</div>
      <div class="header-meta">Academic Assessment & Submission Tracking</div>
    </div>
    <div class="header-right">
      <div class="class-badge">${escapeHtml(className)} • ${escapeHtml(semLabel)}</div>
      <div class="timestamp">Generated: ${escapeHtml(generatedAt)}</div>
    </div>
  </div>

  <!-- SUMMARY STATS -->
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-value">${totalWorks}</div>
      <div class="kpi-label">Total CE Works</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #16A34A;">${totalSubmitted}</div>
      <div class="kpi-label">Submitted</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #DC2626;">${totalPending}</div>
      <div class="kpi-label">Pending</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #2563EB;">${completionRate}%</div>
      <div class="kpi-label">Completion Rate</div>
    </div>
  </div>

  <!-- SECTION 1: MASTER LIST -->
  <div class="section-title">1. CE Works Summary</div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th>Work & Subject</th>
        <th>Teacher</th>
        <th style="text-align: center;">Marks</th>
        <th>Timeline</th>
        <th style="text-align: center;">Submissions</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${worksTableHtml || `<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 18px;">No CE works recorded for ${escapeHtml(semLabel)}.</td></tr>`}
    </tbody>
  </table>

  <!-- SECTION 2: STUDENT BREAKDOWN -->
  ${
    works.length > 0
      ? `
  <div class="section-title" style="page-break-before: auto;">2. Detailed Student Submissions</div>
  ${detailedSectionsHtml}
  `
      : ""
  }

  <!-- SIGNATURES -->
  <div class="signatures-row">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">Class Teacher</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">Head of Department</div>
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

  // Render to PDF using expo-print
  const { uri } = await Print.printToFileAsync({
    html,
    margins: {
      left: 20,
      top: 20,
      right: 20,
      bottom: 20,
    },
  });

  // Open native share/save dialog
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `Download CE Report - ${className} (${semester})`,
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
