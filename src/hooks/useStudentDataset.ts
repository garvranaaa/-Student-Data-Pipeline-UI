import { useState, useMemo, useCallback } from "react";
import type {
  Student,
  StudentStatus,
  CleaningMetadata,
  InvalidRecord,
} from "@/types/student";
import { cleanDataset } from "@/pipeline/cleaner";
import { computeShortlist } from "@/services/filtering";
import { computeStats } from "@/services/statistics";
import { exportShortlistCsv } from "@/services/export";
import type { ShortlistStats } from "@/services/statistics";

// ============================================================
// Application State Hook
// Spec reference: docs/03-ARCHITECTURE.md §6
// Spec reference: docs/01-PROJECT-SPEC.md §8
//
// State architecture — three independent concerns:
//   1. cleanedStudents     — the pipeline output; set once per file upload
//   2. statusByStudentId   — runtime status overrides; changes on toggle only
//   3. minimumTotal        — filter threshold; changes on slider/input only
//
// shortlist and stats are DERIVED (useMemo) — never stored in state.
// The cleaning pipeline runs ONCE per uploaded file.
// ============================================================

/** Processing states for the pipeline execution. */
export type ProcessingState = "idle" | "processing" | "success" | "error";

/** All state managed by this hook — exposed as a single object for simplicity. */
export interface DatasetState {
  processingState: ProcessingState;
  cleanedStudents: Student[];
  statusByStudentId: Map<string, StudentStatus>;
  cleaningMetadata: CleaningMetadata | null;
  cleaningError: string | null;
  invalidRecords: InvalidRecord[];
  minimumTotal: number;
}

/** The return value of useStudentDataset. */
export interface UseStudentDatasetReturn {
  state: DatasetState;
  /** Memoized live shortlist: Active students with total >= minimumTotal. */
  shortlist: Student[];
  /** Memoized statistics derived from the current shortlist. */
  stats: ShortlistStats;
  /** Reads the file, runs the cleaning pipeline, updates state. */
  handleFile: (file: File) => Promise<void>;
  /** Updates the minimum Total threshold. */
  setMinimumTotal: (value: number) => void;
  /** Toggles a single student's Active/Debarred status without touching any other state. */
  toggleStatus: (studentId: string) => void;
  /** Triggers CSV download of the current shortlist. */
  exportCsv: () => void;
}

/**
 * Custom hook that owns all application state for the student pipeline.
 *
 * Key design decisions:
 *   - cleanDataset() is called ONLY inside handleFile(). Threshold/status changes
 *     never re-run the pipeline (spec: §8 "clean the dataset once after upload").
 *   - statusByStudentId is a Map<string, StudentStatus>. toggleStatus creates a
 *     new Map (immutably) updating only the affected entry, so React sees the
 *     reference change and re-memoizes shortlist/stats accordingly.
 *   - shortlist is derived via useMemo — O(n) filter, runs only when its three
 *     inputs change.
 *   - stats is derived via useMemo from shortlist — O(n) summation.
 */
export function useStudentDataset(): UseStudentDatasetReturn {
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [cleanedStudents, setCleanedStudents] = useState<Student[]>([]);
  const [statusByStudentId, setStatusByStudentId] = useState<Map<string, StudentStatus>>(
    () => new Map()
  );
  const [cleaningMetadata, setCleaningMetadata] = useState<CleaningMetadata | null>(null);
  const [cleaningError, setCleaningError] = useState<string | null>(null);
  const [invalidRecords, setInvalidRecords] = useState<InvalidRecord[]>([]);
  const [minimumTotal, setMinimumTotalState] = useState<number>(0);

  // ── Derived shortlist — memoized ────────────────────────────────────────
  // Re-computed only when cleanedStudents, statusByStudentId, or minimumTotal
  // changes. Threshold/status changes never trigger cleanDataset().
  const shortlist = useMemo(
    () => computeShortlist(cleanedStudents, statusByStudentId, minimumTotal),
    [cleanedStudents, statusByStudentId, minimumTotal]
  );

  // ── Derived statistics — memoized ───────────────────────────────────────
  const stats = useMemo(() => computeStats(shortlist), [shortlist]);

  // ── handleFile — runs the cleaning pipeline ─────────────────────────────
  // Called ONLY when a new file is uploaded.
  const handleFile = useCallback(async (file: File): Promise<void> => {
    setProcessingState("processing");
    setCleaningError(null);

    try {
      const csvText = await file.text();
      const result = cleanDataset(csvText);

      if (!result.ok) {
        setProcessingState("error");
        setCleaningError(result.error);
        // Reset cleaned data on pipeline failure
        setCleanedStudents([]);
        setStatusByStudentId(new Map());
        setCleaningMetadata(null);
        setInvalidRecords([]);
        return;
      }

      // Reset status overrides — each student starts Active (as set by the pipeline)
      setStatusByStudentId(new Map());
      setCleanedStudents(result.students);
      setCleaningMetadata(result.metadata);
      setInvalidRecords(result.invalidRecords);
      setProcessingState("success");
    } catch (err) {
      setProcessingState("error");
      setCleaningError(
        err instanceof Error ? err.message : "An unexpected error occurred while reading the file."
      );
    }
  }, []);

  // ── setMinimumTotal — updates filter threshold only ─────────────────────
  const setMinimumTotal = useCallback((value: number) => {
    setMinimumTotalState(value);
  }, []);

  // ── toggleStatus — updates one student's status only ────────────────────
  // Creates a new Map with only the changed entry — no pipeline re-run.
  const toggleStatus = useCallback((studentId: string) => {
    setStatusByStudentId((prev) => {
      const currentStatus = prev.get(studentId) ?? "Active";
      const next = new Map(prev);
      next.set(studentId, currentStatus === "Active" ? "Debarred" : "Active");
      return next;
    });
  }, []);

  // ── exportCsv — triggers download of current shortlist ──────────────────
  const exportCsv = useCallback(() => {
    exportShortlistCsv(shortlist);
  }, [shortlist]);

  const state: DatasetState = {
    processingState,
    cleanedStudents,
    statusByStudentId,
    cleaningMetadata,
    cleaningError,
    invalidRecords,
    minimumTotal,
  };

  return {
    state,
    shortlist,
    stats,
    handleFile,
    setMinimumTotal,
    toggleStatus,
    exportCsv,
  };
}
