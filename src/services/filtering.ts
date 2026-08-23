import type { Student, StudentStatus } from "@/types/student";

// ============================================================
// Shortlist Filtering — Pure Function
// Spec reference: docs/03-ARCHITECTURE.md §7
// Spec reference: docs/01-PROJECT-SPEC.md §4
//
// This is a pure function with no side effects. It does NOT mutate any input.
// The cleaning pipeline runs once; this function derives the live shortlist
// from already-cleaned data + current status overrides + threshold.
// ============================================================

/**
 * Derives the live shortlist from the cleaned dataset, current status state,
 * and the minimum total threshold.
 *
 * A student appears in the shortlist when ALL of the following are true:
 *   1. Their effective status is "Active".
 *   2. Their total >= minimumTotal.
 *
 * Effective status = statusByStudentId.get(studentId) ?? student.status
 * The map overrides allow status changes without mutating the cleaned dataset.
 *
 * Spec reference:
 *   "Status = Active AND Total >= Minimum Total"
 *   "Do NOT permanently remove Debarred students from the cleaned dataset."
 *
 * @param students - The complete cleaned Student array (never mutated).
 * @param statusByStudentId - Map of runtime status overrides keyed by studentId.
 * @param minimumTotal - Inclusive minimum total score threshold.
 * @returns Filtered array of eligible students.
 */
export function computeShortlist(
  students: Student[],
  statusByStudentId: Map<string, StudentStatus>,
  minimumTotal: number
): Student[] {
  return students.filter((s) => {
    const effectiveStatus = statusByStudentId.get(s.studentId) ?? s.status;
    return effectiveStatus === "Active" && s.total >= minimumTotal;
  });
}
