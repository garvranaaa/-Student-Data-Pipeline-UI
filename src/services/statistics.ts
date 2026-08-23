import type { Student } from "@/types/student";

// ============================================================
// Shortlist Statistics — Pure Function
// Spec reference: docs/03-ARCHITECTURE.md §9
// Spec reference: docs/01-PROJECT-SPEC.md §4
//
// All statistics are derived from the CURRENT shortlist — they update
// automatically whenever the shortlist changes (threshold, status, search).
// ============================================================

/** Statistics computed from the current eligible shortlist. */
export interface ShortlistStats {
  /** Number of students currently in the shortlist. */
  matchedCount: number;
  /** Average of student.total across the shortlist. 0 if empty. */
  averageTotal: number;
  /** Average Math score across the shortlist. 0 if empty. */
  averageMath: number;
  /** Average Science score across the shortlist. 0 if empty. */
  averageScience: number;
  /** Average English score across the shortlist. 0 if empty. */
  averageEnglish: number;
}

/**
 * Computes statistics for the current shortlist.
 *
 * All averages are 0 when the shortlist is empty to avoid division-by-zero
 * and to produce a meaningful display state ("No students qualify").
 *
 * Spec reference: docs/03-ARCHITECTURE.md §9
 *   "Statistics should be calculated from the current shortlist."
 *
 * @param shortlist - The currently eligible (Active + threshold-passing) students.
 * @returns Computed statistics object.
 */
export function computeStats(shortlist: Student[]): ShortlistStats {
  const n = shortlist.length;

  if (n === 0) {
    return {
      matchedCount: 0,
      averageTotal: 0,
      averageMath: 0,
      averageScience: 0,
      averageEnglish: 0,
    };
  }

  let sumTotal = 0;
  let sumMath = 0;
  let sumScience = 0;
  let sumEnglish = 0;

  for (const s of shortlist) {
    sumTotal += s.total;
    sumMath += s.math;
    sumScience += s.science;
    sumEnglish += s.english;
  }

  return {
    matchedCount: n,
    averageTotal: sumTotal / n,
    averageMath: sumMath / n,
    averageScience: sumScience / n,
    averageEnglish: sumEnglish / n,
  };
}
