import type { SchemaValidationResult } from "@/types/student";

// ============================================================
// Schema Validator
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §3 (Column Name Normalisation)
// Spec reference: docs/03-ARCHITECTURE.md §14 (Error Handling)
// ============================================================

/**
 * The canonical column names required by the assessment schema.
 * Spec reference: docs/01-PROJECT-SPEC.md §2 (Official Dataset Schema)
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §3
 */
export const REQUIRED_COLUMNS = [
  "Name",
  "Gender",
  "Grade",
  "Math",
  "Science",
  "English",
  "Total",
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

/**
 * Validates that a parsed CSV contains all required columns.
 *
 * Column matching is case-insensitive and whitespace-tolerant because
 * the spec (§3 of DATA-CLEANING-SPEC) states that column names should be
 * normalised before processing. The parser already trims whitespace via
 * transformHeader; this validator performs case-insensitive matching on
 * top of that so "name", "NAME", "Name" all satisfy the "Name" requirement.
 *
 * If required columns are missing, this function returns an explicit failure
 * with the list of missing columns. It does NOT silently create them.
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §3:
 *   "If required columns are missing, stop processing and display a clear error."
 *   "Do not silently create missing required columns."
 *
 * Extra columns beyond the required seven are allowed — they are simply ignored.
 *
 * @param columns - The list of column names returned by the parser.
 * @returns SchemaValidationResult
 */
export function validateSchema(columns: string[]): SchemaValidationResult {
  // Build a lowercase lookup set for the columns that are actually present.
  const presentLower = new Set(columns.map((c) => c.toLowerCase()));

  const missing: string[] = REQUIRED_COLUMNS.filter(
    (req) => !presentLower.has(req.toLowerCase())
  );

  if (missing.length > 0) {
    return {
      ok: false,
      error: `The uploaded CSV is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Please upload a file with the correct schema.`,
      found: columns,
      missing,
    };
  }

  return {
    ok: true,
    columns,
  };
}

/**
 * Normalises a raw column name to its canonical form.
 *
 * Returns the canonical column name if the input matches (case-insensitively),
 * or null if it is not a required column.
 *
 * Used internally by the cleaning pipeline to remap columns before processing.
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §3
 */
export function canonicaliseColumnName(raw: string): RequiredColumn | null {
  const lower = raw.trim().toLowerCase();
  const found = REQUIRED_COLUMNS.find((c) => c.toLowerCase() === lower);
  return found ?? null;
}
