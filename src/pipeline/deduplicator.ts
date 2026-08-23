import type { RawStudentRow } from "@/types/student";

// ============================================================
// Duplicate Detection
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §10
//
// Two levels of duplicate detection:
//   1. Exact raw duplicate  — identical raw string values for every column
//   2. Normalized duplicate — identical fully-normalized field values
//
// Both use O(n) Set<string> lookup, not O(n²) pairwise comparison.
// ============================================================

/** Result shape shared by both deduplication functions. */
export interface DeduplicationResult<T> {
  unique: T[];
  removed: number;
}

/**
 * Produces a stable string key from a raw CSV row by serialising all column
 * values in sorted key order. Sorting by key ensures the key is stable
 * regardless of JSON property insertion order.
 */
function rawRowKey(row: RawStudentRow): string {
  return Object.keys(row)
    .sort()
    .map((k) => `${k}\x00${row[k]}`)
    .join("\x01");
}

/**
 * Removes rows that are completely identical in their raw form.
 *
 * "Identical" means every column value is the same string — no normalisation
 * is applied before comparison. This handles the simplest case where the same
 * row appears verbatim multiple times in the uploaded CSV.
 *
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §10
 *   "Exact duplicate: Remove rows that are completely identical."
 *
 * @param rows - Raw rows from the parser.
 * @returns Unique rows and count of removed exact duplicates.
 */
export function removeExactDuplicates(
  rows: RawStudentRow[]
): DeduplicationResult<RawStudentRow> {
  const seen = new Set<string>();
  const unique: RawStudentRow[] = [];
  let removed = 0;

  for (const row of rows) {
    const key = rawRowKey(row);
    if (seen.has(key)) {
      removed++;
    } else {
      seen.add(key);
      unique.push(row);
    }
  }

  return { unique, removed };
}

/**
 * The normalized fields used for normalized-duplicate comparison.
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §10
 *   "The comparison should include: Name, Gender, Grade, Math, Science,
 *    English, Total."
 */
export interface NormalizedKey {
  name: string;
  gender: string;
  grade: number;
  math: number;
  science: number;
  english: number;
  total: number; // recalculated total, not the raw uploaded value
}

/**
 * Produces a canonical string key from a normalized record for set-based
 * deduplication. Using a delimiter unlikely to appear in student names.
 */
export function normalizedRecordKey(r: NormalizedKey): string {
  return `${r.name}\x00${r.gender}\x00${r.grade}\x00${r.math}\x00${r.science}\x00${r.english}\x00${r.total}`;
}

/**
 * Removes normalized-duplicate records from a list of already-normalized items.
 *
 * A normalized duplicate is a record whose complete set of canonical field
 * values (name, gender, grade, math, science, english, total) is identical
 * to a record already seen.
 *
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §10
 *   "Normalized duplicate: After safe normalization, remove rows where the
 *    complete normalized student record is identical."
 *   "Do NOT deduplicate solely by Name."
 *
 * @param records - Items that must expose a getKey() function or can have
 *                  keys derived externally. We accept a generic array and a
 *                  key-extractor so this function stays pure and reusable.
 * @returns Unique records and count of removed normalized duplicates.
 */
export function removeNormalizedDuplicates<T>(
  records: T[],
  keyOf: (item: T) => string
): DeduplicationResult<T> {
  const seen = new Set<string>();
  const unique: T[] = [];
  let removed = 0;

  for (const record of records) {
    const key = keyOf(record);
    if (seen.has(key)) {
      removed++;
    } else {
      seen.add(key);
      unique.push(record);
    }
  }

  return { unique, removed };
}
