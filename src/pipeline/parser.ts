import Papa from "papaparse";
import type { ParseResult, RawStudentRow } from "@/types/student";

// ============================================================
// CSV Parser
// Spec reference: docs/05-ANTIGRAVITY-WORKFLOW.md §PHASE 1
// Spec reference: docs/03-ARCHITECTURE.md §3 (Architecture diagram)
// ============================================================

/**
 * Parses a raw CSV string using Papa Parse.
 *
 * Responsibilities:
 *  - Detect empty input.
 *  - Detect Papa Parse hard errors (malformed CSV that produces no data).
 *  - Return raw string rows with header:true so downstream stages can
 *    validate schema and normalise values independently.
 *  - Trim column header names as a minimal pre-processing step
 *    so that leading/trailing whitespace in the header row doesn't
 *    silently break schema validation.
 *
 * This function does NOT:
 *  - Normalise names, gender, grade, or marks (Phase 2).
 *  - Validate column presence (validator.ts).
 *  - Coerce types (that is the cleaning pipeline's job).
 *
 * @param csvText - Raw text content of the uploaded CSV file.
 * @returns ParseResult — either a success with raw rows, or a failure with
 *          a human-readable error message.
 */
export function parseCsv(csvText: string): ParseResult {
  const trimmed = csvText.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      error: "The uploaded file is empty. Please upload a valid CSV file.",
    };
  }

  const result = Papa.parse<RawStudentRow>(trimmed, {
    header: true,
    skipEmptyLines: true,
    // Do NOT enable dynamicTyping — we want raw strings so that the
    // normalisation layer can handle "28 marks", "Grade 11", etc. itself.
    dynamicTyping: false,
    // transform trims leading/trailing whitespace from every cell value
    // at parse time so that downstream steps get clean string inputs.
    transform: (value: string) => value.trim(),
    // transformHeader trims whitespace from column names so that
    // "  Name  " in the CSV header matches the expected canonical "Name".
    transformHeader: (header: string) => header.trim(),
  });

  // Papa Parse populates result.errors for row-level issues but still
  // returns whatever data it could parse. A true hard failure (unparseable
  // file) results in zero data rows AND errors present.
  if (result.errors.length > 0 && result.data.length === 0) {
    const firstError = result.errors[0];
    return {
      ok: false,
      error: `CSV parsing failed: ${firstError.message} (row ${firstError.row ?? "unknown"})`,
    };
  }

  if (result.data.length === 0) {
    return {
      ok: false,
      error:
        "The CSV file contains no data rows. Please upload a file with at least one student record.",
    };
  }

  const columns = result.meta.fields ?? [];

  return {
    ok: true,
    rows: result.data,
    rowCount: result.data.length,
    columns,
  };
}
