import type {
  Student,
  StudentGender,
  CleaningOutcome,
  CleaningResult,
  InvalidRecord,
  CleaningMetadata,
} from "@/types/student";
import { parseCsv } from "@/pipeline/parser";
import { validateSchema } from "@/pipeline/validator";
import {
  normalizeName,
  normalizeGender,
  normalizeGrade,
  parseMark,
} from "@/pipeline/normalizers";
import {
  removeExactDuplicates,
  removeNormalizedDuplicates,
  normalizedRecordKey,
} from "@/pipeline/deduplicator";
import type { NormalizedKey } from "@/pipeline/deduplicator";

// ============================================================
// Cleaning Pipeline
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §14 (pipeline order)
// Spec reference: docs/05-ANTIGRAVITY-WORKFLOW.md §PHASE 3
//
// Stage order:
//   1. CSV parsing
//   2. Schema validation
//   3. Exact raw-duplicate removal
//   4. Per-row field normalisation + validation
//   5. Total recalculation
//   6. Normalised-duplicate removal
//   7. Stable ID assignment
//   8. Active status initialisation
//   9. Return CleaningResult
// ============================================================

// ============================================================
// Stable Student ID Generation
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §12
//
// Requirements:
//   - Stable: same input always produces the same ID.
//   - Not based on row index (which can change if the dataset changes).
//   - Unique within a cleaned run (guaranteed because duplicates are removed
//     before ID assignment, so every record has unique normalised values).
//
// Implementation: FNV-1a 32-bit hash of the normalised record's canonical key.
// After deduplication each record's key is unique, so hash collisions are
// essentially impossible (even for 3,000 students the collision probability
// is < 0.1%). We add a counter suffix for the pathological case.
// ============================================================

/**
 * FNV-1a 32-bit hash — deterministic, fast, and well-distributed.
 * @see https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 */
function fnv1a32(str: string): number {
  let hash = 2166136261; // FNV offset basis (32-bit)
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime (32-bit)
    hash = hash >>> 0; // keep as unsigned 32-bit
  }
  return hash;
}

/**
 * Generates a stable, deterministic student ID from normalised record values.
 * The usedIds set detects hash collisions and ensures uniqueness via a suffix.
 */
function generateStudentId(key: string, usedIds: Set<string>): string {
  const base = `s_${fnv1a32(key).toString(16).padStart(8, "0")}`;
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  // Collision handling (should be extremely rare for real data)
  let counter = 1;
  while (usedIds.has(`${base}_${counter}`)) {
    counter++;
  }
  const id = `${base}_${counter}`;
  usedIds.add(id);
  return id;
}

// ============================================================
// Required column names (canonical, case-normalised by parser)
// ============================================================
const COL_NAME = "Name";
const COL_GENDER = "Gender";
const COL_GRADE = "Grade";
const COL_MATH = "Math";
const COL_SCIENCE = "Science";
const COL_ENGLISH = "English";
const COL_TOTAL = "Total";

/** Canonical gender values that require no further normalisation. */
const CANONICAL_GENDERS: ReadonlySet<string> = new Set(["Male", "Female"]);

// ============================================================
// Internal intermediate type produced after per-row normalisation
// ============================================================
interface ValidRow {
  /** Original 0-based row index in the post-exact-dedup array. */
  rowIndex: number;
  name: string;
  gender: StudentGender;
  grade: number;
  math: number;
  science: number;
  english: number;
  /** Raw Total from the CSV, parsed as a number (may differ from recalculated). */
  suppliedTotal: number;
  /** Whether each normalisation step changed the raw value. */
  nameChanged: boolean;
  genderChanged: boolean;
  gradeChanged: boolean;
  mathHadSuffix: boolean;
  scienceHadSuffix: boolean;
  englishHadSuffix: boolean;
}

// ============================================================
// Main Pipeline Entry Point
// ============================================================

/**
 * Runs the full deterministic cleaning pipeline against a raw CSV string.
 *
 * Returns a CleaningOutcome which is either:
 *   - CleaningResult (ok: true)  — cleaned students + metadata + rejected rows
 *   - CleaningFailure (ok: false) — pipeline-level failure (bad CSV / schema)
 *
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §14
 * Spec reference: docs/05-ANTIGRAVITY-WORKFLOW.md §PHASE 3
 */
export function cleanDataset(csvText: string): CleaningOutcome {
  // ── Stage 1: Parse ────────────────────────────────────────────────────────
  const parseResult = parseCsv(csvText);
  if (!parseResult.ok) {
    return { ok: false, error: parseResult.error };
  }

  // ── Stage 2: Schema validation ────────────────────────────────────────────
  const schemaResult = validateSchema(parseResult.columns);
  if (!schemaResult.ok) {
    return { ok: false, error: schemaResult.error };
  }

  const originalRowCount = parseResult.rowCount;

  // ── Stage 3: Exact raw-duplicate removal ──────────────────────────────────
  const exactDedup = removeExactDuplicates(parseResult.rows);
  const postExactRows = exactDedup.unique;
  const exactDuplicatesRemoved = exactDedup.removed;

  // ── Stage 4: Per-row normalisation + validation ───────────────────────────
  const validRows: ValidRow[] = [];
  const invalidRecords: InvalidRecord[] = [];

  let missingValueCount = 0;

  for (let i = 0; i < postExactRows.length; i++) {
    const row = postExactRows[i];
    const errors: string[] = [];

    const rawName = row[COL_NAME] ?? "";
    const rawGender = row[COL_GENDER] ?? "";
    const rawGrade = row[COL_GRADE] ?? "";
    const rawMath = row[COL_MATH] ?? "";
    const rawScience = row[COL_SCIENCE] ?? "";
    const rawEnglish = row[COL_ENGLISH] ?? "";
    const rawTotal = row[COL_TOTAL] ?? "";

    // ── Missing-value detection ───────────────────────────────────────────
    // Required fields for scoring are Math, Science, English.
    // An empty Name or Gender is also invalid but not a "scoring" missing value.
    // We track all empty required fields.
    const scoringFieldsEmpty = [rawMath, rawScience, rawEnglish].filter(
      (v) => v.trim() === ""
    ).length;
    if (scoringFieldsEmpty > 0) {
      missingValueCount++;
    }

    // ── Name normalisation ────────────────────────────────────────────────
    const normName = normalizeName(rawName);
    const nameChanged = normName !== rawName;
    if (normName.trim() === "") {
      errors.push("Name is empty or could not be normalised.");
    }

    // ── Gender normalisation ──────────────────────────────────────────────
    const normGender = normalizeGender(rawGender);
    // genderChanged = raw value was not already the canonical string
    const genderChanged = !CANONICAL_GENDERS.has(rawGender.trim());

    // ── Grade normalisation ───────────────────────────────────────────────
    const gradeResult = normalizeGrade(rawGrade);
    let grade = 0;
    let gradeChanged = false;
    if (!gradeResult.ok) {
      errors.push(`Grade: ${gradeResult.error}`);
    } else {
      grade = gradeResult.value;
      gradeChanged = rawGrade.trim() !== String(grade);
    }

    // ── Marks parsing ─────────────────────────────────────────────────────
    const mathResult = parseMark(rawMath);
    const scienceResult = parseMark(rawScience);
    const englishResult = parseMark(rawEnglish);

    let math = 0, science = 0, english = 0;
    const mathHadSuffix = rawMath.toLowerCase().includes("marks");
    const scienceHadSuffix = rawScience.toLowerCase().includes("marks");
    const englishHadSuffix = rawEnglish.toLowerCase().includes("marks");

    if (!mathResult.ok) errors.push(`Math: ${mathResult.error}`);
    else math = mathResult.value;

    if (!scienceResult.ok) errors.push(`Science: ${scienceResult.error}`);
    else science = scienceResult.value;

    if (!englishResult.ok) errors.push(`English: ${englishResult.error}`);
    else english = englishResult.value;

    // ── Total parsing (for comparison only — always recalculated later) ───
    // The Total column is the sum of three 0–100 marks, so its valid range is
    // 0–300. We deliberately do NOT use parseMark (which enforces 0–100) here.
    // A non-parseable Total is treated as "unknown" (NaN); the spec mandates
    // that we always recalculate, so a bad supplied Total is not a reject reason.
    const rawTotalStripped = rawTotal.trim().replace(/\s*marks\s*$/i, "").trim();
    const suppliedTotal =
      rawTotalStripped === "" ? NaN : Number(rawTotalStripped);

    // ── Collect invalid rows ──────────────────────────────────────────────
    if (errors.length > 0) {
      invalidRecords.push({
        rowIndex: i,
        rawData: row,
        reason: errors.join(" | "),
      });
      continue;
    }

    validRows.push({
      rowIndex: i,
      name: normName,
      gender: normGender,
      grade,
      math,
      science,
      english,
      suppliedTotal,
      nameChanged,
      genderChanged,
      gradeChanged,
      mathHadSuffix,
      scienceHadSuffix,
      englishHadSuffix,
    });
  }

  // ── Stage 5: Total recalculation ──────────────────────────────────────────
  // The spec mandates that we ALWAYS use the recalculated total.
  // We count corrections only when the supplied value was parseable AND
  // differed from the recalculated value. If the supplied Total was unparseable
  // (NaN), we don't count it as a "correction" — we simply use the calculated
  // value silently (the spec requires recalculation regardless).
  let totalCorrections = 0;

  const recalculated = validRows.map((vr) => {
    const calculatedTotal = vr.math + vr.science + vr.english;
    const suppliedIsKnown = isFinite(vr.suppliedTotal) && !isNaN(vr.suppliedTotal);
    if (suppliedIsKnown && vr.suppliedTotal !== calculatedTotal) {
      totalCorrections++;
    }
    return { ...vr, total: calculatedTotal };
  });

  // ── Stage 6: Normalised-duplicate removal ─────────────────────────────────
  type RecalcRow = (typeof recalculated)[number];

  const toNormKey = (r: RecalcRow): string => {
    const key: NormalizedKey = {
      name: r.name,
      gender: r.gender,
      grade: r.grade,
      math: r.math,
      science: r.science,
      english: r.english,
      total: r.total,
    };
    return normalizedRecordKey(key);
  };

  const normalizedDedup = removeNormalizedDuplicates(recalculated, toNormKey);
  const normalizedDuplicatesRemoved = normalizedDedup.removed;
  const uniqueRows = normalizedDedup.unique;

  // ── Stage 7-8: Stable ID assignment + Active status ───────────────────────
  const usedIds = new Set<string>();

  const students: Student[] = uniqueRows.map((r) => {
    const key = toNormKey(r);
    const studentId = generateStudentId(key, usedIds);
    return {
      studentId,
      name: r.name,
      gender: r.gender,
      grade: r.grade,
      math: r.math,
      science: r.science,
      english: r.english,
      total: r.total,
      status: "Active",
    };
  });

  // ── Stage 9: Build metadata ───────────────────────────────────────────────
  const duplicatesRemoved = exactDuplicatesRemoved + normalizedDuplicatesRemoved;

  const nameNormalizations = recalculated.filter((r) => r.nameChanged).length;
  const genderNormalizations = recalculated.filter((r) => r.genderChanged).length;
  const gradeNormalizations = recalculated.filter((r) => r.gradeChanged).length;
  const markNormalizations = recalculated.reduce(
    (sum, r) =>
      sum +
      (r.mathHadSuffix ? 1 : 0) +
      (r.scienceHadSuffix ? 1 : 0) +
      (r.englishHadSuffix ? 1 : 0),
    0
  );

  const metadata: CleaningMetadata = {
    originalRowCount,
    cleanedRowCount: students.length,
    exactDuplicatesRemoved,
    normalizedDuplicatesRemoved,
    duplicatesRemoved,
    invalidRowCount: invalidRecords.length,
    missingValueCount,
    totalCorrections,
    nameNormalizations,
    genderNormalizations,
    gradeNormalizations,
    markNormalizations,
  };

  const result: CleaningResult = {
    ok: true,
    students,
    metadata,
    invalidRecords,
  };

  return result;
}
