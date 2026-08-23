// ============================================================
// Student Data Model
// Spec reference: docs/03-ARCHITECTURE.md §5, docs/02-DATA-CLEANING-SPEC.md §12-13
// ============================================================

/**
 * Allowed status values for every cleaned student.
 * Default is "Active" after cleaning. Status is application state only —
 * it is never read from the CSV.
 */
export type StudentStatus = "Active" | "Debarred";

/**
 * Canonical gender values after normalization.
 * "Unknown" is used when the raw value cannot be mapped to Male/Female.
 */
export type StudentGender = "Male" | "Female" | "Unknown";

// ============================================================
// Raw CSV Row (as parsed by Papa Parse before any normalization)
// ============================================================

/**
 * Represents a single raw row straight from Papa Parse with header:true.
 * All values are strings at this stage — no coercion yet.
 *
 * The canonical header names must be present after column-name normalization.
 * This type is intentionally a string record because the CSV may contain
 * extra columns or column-name variations; the validator is responsible
 * for asserting the required fields are present.
 *
 * We avoid `Record<string, any>` and use `Record<string, string>` because
 * Papa Parse with header:true returns string values for every cell unless
 * dynamicTyping is enabled (we deliberately leave it disabled to keep
 * raw parsing predictable and normalization explicit).
 */
export type RawStudentRow = Record<string, string>;

// ============================================================
// Cleaned Student Model
// ============================================================

/**
 * A fully parsed, validated, and normalized student record.
 * Values are typed (numbers instead of strings).
 * studentId is assigned by the application after cleaning.
 * status is initialised to "Active" by the pipeline.
 *
 * Spec reference: docs/03-ARCHITECTURE.md §5
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §12-13
 */
export interface Student {
  /** Stable application-assigned identifier. Never the CSV row index. */
  studentId: string;
  /** Normalized display name. */
  name: string;
  /** Normalized gender. May be "Unknown" if raw value was unrecognised. */
  gender: StudentGender;
  /** Numeric grade, 1–12. */
  grade: number;
  /** Numeric Math mark, 0–100. */
  math: number;
  /** Numeric Science mark, 0–100. */
  science: number;
  /** Numeric English mark, 0–100. */
  english: number;
  /**
   * Recalculated total: math + science + english.
   * The uploaded Total is never trusted blindly.
   * Spec reference: docs/02-DATA-CLEANING-SPEC.md §9
   */
  total: number;
  /** Application-managed status. Default: "Active". */
  status: StudentStatus;
}

// ============================================================
// Parsing Result Types
// ============================================================

/** Successful result returned by the CSV parser. */
export interface ParseSuccess {
  ok: true;
  /** Raw rows extracted from the CSV, with canonical header names. */
  rows: RawStudentRow[];
  /** Number of rows in the parsed result (before any cleaning). */
  rowCount: number;
  /** Column headers found in the CSV (after column-name normalisation). */
  columns: string[];
}

/** Failure result returned by the CSV parser. */
export interface ParseFailure {
  ok: false;
  /** Human-readable description of what went wrong. */
  error: string;
}

/** Union result type for parseCsv(). */
export type ParseResult = ParseSuccess | ParseFailure;

// ============================================================
// Schema Validation Result Types
// ============================================================

/** Successful schema validation result. */
export interface SchemaValid {
  ok: true;
  /** Canonical column names present in the CSV. */
  columns: string[];
}

/** Failed schema validation result. */
export interface SchemaInvalid {
  ok: false;
  /** Human-readable error explaining which columns are missing. */
  error: string;
  /** Columns that were found. */
  found: string[];
  /** Required columns that were absent. */
  missing: string[];
}

/** Union result type for validateSchema(). */
export type SchemaValidationResult = SchemaValid | SchemaInvalid;

// ============================================================
// Normalization Result Types
// ============================================================

/**
 * Generic typed result for normalization functions that can fail.
 *
 * Used by normalizeGrade() and parseMark() where an invalid input must
 * be surfaced to the cleaning pipeline rather than silently coerced to
 * a default value (e.g. 0).
 *
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §6, §7
 *   "Invalid grades should be flagged rather than silently converted."
 *   "Do not silently convert invalid academic marks to zero."
 */
export type NormalizeSuccess<T> = { ok: true; value: T };
export type NormalizeFailure = { ok: false; error: string };
export type NormalizeResult<T> = NormalizeSuccess<T> | NormalizeFailure;

// ============================================================
// Cleaning Pipeline Result Types
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §11-13
// ============================================================

/**
 * A row that was rejected during the cleaning pipeline, with the reason why.
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §8
 */
export interface InvalidRecord {
  /** 0-based row index in the original parsed CSV (before any deduplication). */
  rowIndex: number;
  /** The raw unparsed CSV row values. */
  rawData: RawStudentRow;
  /** Human-readable reason the row was rejected. */
  reason: string;
}

/**
 * Cleaning statistics produced by the pipeline.
 * Spec reference: docs/02-DATA-CLEANING-SPEC.md §11
 */
export interface CleaningMetadata {
  /** Total rows in the uploaded CSV (header not counted). */
  originalRowCount: number;
  /** Rows that became valid Student records. */
  cleanedRowCount: number;
  /** Rows removed because they were byte-for-byte identical raw rows. */
  exactDuplicatesRemoved: number;
  /** Rows removed because their fully-normalized values were identical. */
  normalizedDuplicatesRemoved: number;
  /** Total duplicates removed (exact + normalized). Combined for the UI. */
  duplicatesRemoved: number;
  /** Rows rejected because they contained invalid or unresolvable data. */
  invalidRowCount: number;
  /** Rows that had at least one required scoring field completely empty. */
  missingValueCount: number;
  /** Records where the supplied Total differed from Math+Science+English. */
  totalCorrections: number;
  /** Rows where the raw Name differed from its normalized form. */
  nameNormalizations: number;
  /** Rows where the raw Gender was not already a canonical form. */
  genderNormalizations: number;
  /** Rows where Grade required prefix parsing (e.g. "Grade 11" → 11). */
  gradeNormalizations: number;
  /** Individual mark cells that contained the " marks" suffix. */
  markNormalizations: number;
}

/**
 * Successful pipeline outcome — cleaned students plus metadata and
 * a transparent list of any rejected rows.
 */
export interface CleaningResult {
  ok: true;
  students: Student[];
  metadata: CleaningMetadata;
  invalidRecords: InvalidRecord[];
}

/**
 * Pipeline-level failure: the CSV could not be parsed or the schema was wrong.
 * Individual row-level failures are captured in CleaningResult.invalidRecords.
 */
export interface CleaningFailure {
  ok: false;
  error: string;
}

/** Union type returned by cleanDataset(). */
export type CleaningOutcome = CleaningResult | CleaningFailure;
