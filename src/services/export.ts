import type { Student } from "@/types/student";

// ============================================================
// CSV Export Service
// Spec reference: docs/01-PROJECT-SPEC.md §6
// Spec reference: docs/03-ARCHITECTURE.md §10
//
// Generates a CSV download for the CURRENT shortlist.
// The caller is responsible for passing only Active, threshold-passing
// students — this function does not perform any additional filtering.
//
// Uses URL.createObjectURL + a temporary anchor element to trigger
// a browser file-save dialog — no network requests, no new dependencies.
// ============================================================

/** Exported CSV columns in display order. */
const CSV_HEADERS = ["Name", "Gender", "Grade", "Math", "Science", "English", "Total"] as const;

/**
 * Escapes a CSV field value by wrapping in double quotes if the value
 * contains commas, double quotes, or newlines.
 */
function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Triggers a browser file download of the current shortlist as a CSV file.
 *
 * The exported CSV uses cleaned, normalised field values — never raw input.
 * Debarred students must NOT be present in the passed shortlist (the caller,
 * i.e. computeShortlist, is responsible for that guarantee).
 *
 * Spec reference: docs/01-PROJECT-SPEC.md §6
 *   "The exported CSV must contain only students who satisfy Active AND Total >= threshold."
 *   "The exported data must use cleaned/normalized values."
 *
 * @param shortlist - The currently eligible Active students to export.
 */
export function exportShortlistCsv(shortlist: Student[]): void {
  const rows: string[] = [CSV_HEADERS.join(",")];

  for (const s of shortlist) {
    const row = [
      escapeField(s.name),
      escapeField(s.gender),
      String(s.grade),
      String(s.math),
      String(s.science),
      String(s.english),
      String(s.total),
    ].join(",");
    rows.push(row);
  }

  const csvContent = rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "shortlist.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Release the object URL to free memory
  URL.revokeObjectURL(url);
}
