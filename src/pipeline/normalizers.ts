import type { StudentGender, NormalizeResult } from "@/types/student";

// ============================================================
// Normalization Functions
//
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §4-7
// Spec reference: docs/05-ANTIGRAVITY-WORKFLOW.md §PHASE 2
//
// These are PURE functions. They:
//   - take a raw string value
//   - return a normalised value or a typed failure
//   - have NO side effects
//   - do NOT access CSV files, React state, browser APIs, or the DOM
//   - do NOT perform deduplication
//   - do NOT recalculate Total
//   - do NOT assign student IDs
// ============================================================

// ============================================================
// 1. Name Normalization
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §4
// ============================================================

/**
 * Normalizes a raw student name string using safe, deterministic formatting.
 *
 * Steps applied in order:
 *  1. Trim leading/trailing whitespace.
 *  2. Remove surrounding quotation marks (both " and ' when wrapping the whole name).
 *  3. Remove stray apostrophe characters that appear only at the very start or
 *     end of the name. Interior apostrophes (e.g. O'Brien) are preserved.
 *  4. Collapse any run of internal whitespace to a single space.
 *  5. Apply title case so each space-delimited word begins with an uppercase
 *     letter — and within each word, each apostrophe-delimited segment is
 *     also capitalised independently so that "O'Brien" → "O'Brien" (not
 *     "O'brien").
 *
 * What this function does NOT do:
 *  - fuzzy match or compare names
 *  - infer that two different names refer to the same person
 *  - perform spelling correction
 *
 * Spec quote: "Do not perform aggressive fuzzy matching."
 * Spec quote: "Do not assume two students with the same normalized name
 *              are duplicates."
 *
 * @param raw - The raw Name cell value from the CSV row.
 * @returns Normalised display name string. Always returns a string —
 *          name normalisation cannot fail.
 */
export function normalizeName(raw: string): string {
  // Step 1: trim outer whitespace
  let name = raw.trim();

  // Step 2: remove surrounding double or single quotation marks.
  // Handles: "Aditi" → Aditi, 'Aditi' → Aditi
  if (
    (name.startsWith('"') && name.endsWith('"')) ||
    (name.startsWith("'") && name.endsWith("'"))
  ) {
    name = name.slice(1, -1).trim();
  }

  // Step 3: remove stray leading/trailing apostrophes that are NOT part of a
  // legitimate name (e.g. "Navya'" → "Navya", "'Navya'" → "Navya" after step 2).
  // We only strip apostrophes at the very edges; interior ones (O'Brien) are
  // preserved. Re-trim in case whitespace was adjacent to the apostrophe.
  name = name.replace(/^'+/, "").replace(/'+$/, "").trim();

  // Step 4: collapse repeated internal whitespace to a single space.
  name = name.replace(/\s+/g, " ");

  // Step 5: title case.
  // We split on spaces to get words, then for each word we split on apostrophes
  // to get segments, capitalise the first letter of every segment and lowercase
  // the rest, then rejoin the segments with apostrophes.
  //
  // This correctly preserves internal apostrophes while normalising casing:
  //   "O'Brien" → segments ["O","Brien"] → ["O","Brien"] → "O'Brien"
  //   "o'brien" → segments ["o","brien"] → ["O","Brien"] → "O'Brien"
  //   "ADITI"   → segments ["ADITI"]     → ["Aditi"]     → "Aditi"
  name = name
    .split(" ")
    .map((word) =>
      word
        .split("'")
        .map((segment) =>
          segment.length === 0
            ? segment
            : segment[0].toUpperCase() + segment.slice(1).toLowerCase()
        )
        .join("'")
    )
    .join(" ");

  return name;
}


// ============================================================
// 2. Gender Normalization
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §5
// ============================================================

/**
 * Exact gender mapping from spec §5.
 * We define this as a frozen map so the mapping is visible, testable,
 * and guaranteed to be consistent.
 */
const GENDER_MAP: Record<string, StudentGender> = {
  m: "Male",
  male: "Male",
  "1": "Male",
  f: "Female",
  female: "Female",
  "0": "Female",
} as const;

/**
 * Normalises a raw gender string to the canonical StudentGender type.
 *
 * The mapping is case-insensitive; the raw value is lowercased before
 * lookup. Surrounding whitespace is trimmed.
 *
 * Unknown values are returned as "Unknown" — they are NEVER silently
 * guessed. Spec quote: "Unknown values must not be silently guessed."
 *
 * @param raw - The raw Gender cell value from the CSV row.
 * @returns "Male" | "Female" | "Unknown"
 */
export function normalizeGender(raw: string): StudentGender {
  const key = raw.trim().toLowerCase();
  return GENDER_MAP[key] ?? "Unknown";
}

// ============================================================
// 3. Grade Normalization
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §6
// ============================================================

/** Valid grade range per spec. */
const GRADE_MIN = 1;
const GRADE_MAX = 12;

/**
 * Normalises a raw grade string to a validated integer in [1, 12].
 *
 * Supported input formats:
 *  - Plain numeric: "11", "1", "12"
 *  - Prefixed:      "Grade 11", "Grade 1", "grade 12" (case-insensitive)
 *
 * The numeric part is extracted by stripping the case-insensitive prefix
 * "grade" and trimming whitespace, then parsing as an integer.
 *
 * Returns NormalizeFailure when:
 *  - The extracted value is not a valid integer.
 *  - The grade is outside the 1–12 range.
 *  - The input is empty or whitespace-only.
 *
 * Spec quote: "Invalid grades should be flagged rather than silently
 *              converted to a random value."
 *
 * @param raw - The raw Grade cell value from the CSV row.
 * @returns NormalizeResult<number>
 */
export function normalizeGrade(raw: string): NormalizeResult<number> {
  // Strip optional "Grade" prefix (case-insensitive), then trim
  const stripped = raw.trim().replace(/^grade\s*/i, "").trim();

  if (stripped === "") {
    return { ok: false, error: `Grade value is empty.` };
  }

  // Only accept whole-number integers — a grade of "2.5" is not valid
  if (!/^\d+$/.test(stripped)) {
    return {
      ok: false,
      error: `Grade "${raw}" is not a valid integer grade value.`,
    };
  }

  const grade = parseInt(stripped, 10);

  if (grade < GRADE_MIN || grade > GRADE_MAX) {
    return {
      ok: false,
      error: `Grade ${grade} is outside the allowed range (${GRADE_MIN}–${GRADE_MAX}).`,
    };
  }

  return { ok: true, value: grade };
}

// ============================================================
// 4. Marks Parsing
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §7
// ============================================================

/** Valid mark range per spec. */
const MARK_MIN = 0;
const MARK_MAX = 100;

/**
 * Parses a raw subject mark string to a validated number in [0, 100].
 *
 * Supported input formats:
 *  - Plain numeric: "47", "0", "100"
 *  - Suffixed with " marks": "28 marks", "92 marks" (case-insensitive)
 *
 * The numeric part is extracted by stripping the case-insensitive suffix
 * "marks" and trimming whitespace, then converting to a number.
 *
 * Returns NormalizeFailure when:
 *  - The extracted value is non-numeric.
 *  - The value is outside the 0–100 range.
 *  - The input is empty or whitespace-only.
 *
 * Spec quote: "Do not silently convert invalid academic marks to zero."
 * Spec quote: "Non-numeric values are invalid."
 * Spec quote: "Values outside this range are invalid."
 *
 * Note on decimals: the spec does not explicitly forbid decimal marks.
 * A value like "47.5" is accepted as valid as long as it is in [0, 100].
 * The `Student` model stores marks as `number`, which naturally handles
 * both integers and decimals.
 *
 * @param raw - The raw Math/Science/English cell value from the CSV row.
 * @returns NormalizeResult<number>
 */
export function parseMark(raw: string): NormalizeResult<number> {
  // Strip optional "marks" suffix (case-insensitive), then trim
  const stripped = raw.trim().replace(/\s*marks\s*$/i, "").trim();

  if (stripped === "") {
    return { ok: false, error: `Mark value is empty.` };
  }

  const value = Number(stripped);

  if (!isFinite(value) || isNaN(value)) {
    return {
      ok: false,
      error: `Mark "${raw}" is not a valid number.`,
    };
  }

  if (value < MARK_MIN || value > MARK_MAX) {
    return {
      ok: false,
      error: `Mark ${value} is outside the allowed range (${MARK_MIN}–${MARK_MAX}).`,
    };
  }

  return { ok: true, value };
}
