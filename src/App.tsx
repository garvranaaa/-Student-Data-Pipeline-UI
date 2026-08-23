import { useStudentDataset } from "@/hooks/useStudentDataset";
import { FileUploader } from "@/components/FileUploader";
import { DatasetSummary } from "@/components/DatasetSummary";
import { FilterBar } from "@/components/FilterBar";
import { StatisticsCards } from "@/components/StatisticsCards";
import { StudentTable } from "@/components/StudentTable";
import { ExportButton } from "@/components/ExportButton";

/**
 * Root application component.
 *
 * Delegates all state management to useStudentDataset. App.tsx is responsible
 * only for layout and wiring — no pipeline logic lives here.
 *
 * UI sections (per spec docs/03-ARCHITECTURE.md §12):
 *   1. Header
 *   2. Upload area
 *   3. Processing / error / idle states
 *   4. Data-quality summary
 *   5. Filter controls
 *   6. Shortlist statistics
 *   7. Export action
 *   8. Cleaned data table (with Active/Debarred controls)
 */
function App() {
  const {
    state,
    shortlist,
    stats,
    handleFile,
    setMinimumTotal,
    toggleStatus,
    exportCsv,
  } = useStudentDataset();

  const {
    processingState,
    cleanedStudents,
    statusByStudentId,
    cleaningMetadata,
    cleaningError,
    invalidRecords,
    minimumTotal,
  } = state;

  // Derived count for display
  const debarredCount = cleanedStudents.filter(
    (s) => (statusByStudentId.get(s.studentId) ?? s.status) === "Debarred"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Student Selection Pipeline
              </h1>
              <p className="text-xs text-gray-500">
                Upload · Clean · Filter · Export
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Upload ──────────────────────────────────────────────────────── */}
        <section aria-label="File upload">
          <FileUploader
            onFile={handleFile}
            isProcessing={processingState === "processing"}
          />
        </section>

        {/* ── Processing spinner (shown separately while async work runs) ─── */}
        {processingState === "processing" && (
          <div
            role="status"
            aria-live="polite"
            className="text-center text-sm text-gray-500"
          >
            Cleaning dataset, please wait…
          </div>
        )}

        {/* ── Pipeline error ────────────────────────────────────────────── */}
        {processingState === "error" && cleaningError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5"
          >
            <h2 className="mb-1 font-semibold text-red-800">
              Dataset Error
            </h2>
            <p className="text-sm text-red-700">{cleaningError}</p>
            <p className="mt-2 text-xs text-red-500">
              Please check the file and try again. Ensure it has the expected
              columns: Name, Gender, Grade, Math, Science, English, Total.
            </p>
          </div>
        )}

        {/* ── Idle empty state ─────────────────────────────────────────── */}
        {processingState === "idle" && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
            <p className="text-sm text-gray-500">
              Upload a CSV file above to get started.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Expected columns: Name, Gender, Grade, Math, Science, English, Total
            </p>
          </div>
        )}

        {/* ── Success state ─────────────────────────────────────────────── */}
        {processingState === "success" && cleaningMetadata && (
          <>
            {/* Cleaning summary */}
            <section aria-label="Cleaning summary">
              <DatasetSummary
                metadata={cleaningMetadata}
                invalidRecords={invalidRecords}
              />
            </section>

            {/* Filter + statistics */}
            <section aria-label="Filter and statistics">
              <div className="space-y-4">
                <FilterBar
                  minimumTotal={minimumTotal}
                  onChange={setMinimumTotal}
                  shortlistCount={shortlist.length}
                  totalCleaned={cleanedStudents.length}
                />
                <StatisticsCards
                  stats={stats}
                  totalStudents={cleanedStudents.length}
                  debarredCount={debarredCount}
                />
              </div>
            </section>

            {/* Export */}
            <section aria-label="Export shortlist">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Download Shortlist
                  </p>
                  <p className="text-xs text-gray-400">
                    Exports only Active students with Total ≥ {minimumTotal}
                  </p>
                </div>
                <ExportButton
                  onExport={exportCsv}
                  count={shortlist.length}
                />
              </div>
            </section>

            {/* Zero-match state */}
            {shortlist.length === 0 && cleanedStudents.length > 0 && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center"
              >
                <p className="text-sm font-medium text-amber-800">
                  No students qualify at the current threshold.
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  Try lowering the Minimum Total Score or check whether students
                  have been Debarred.
                </p>
              </div>
            )}

            {/* Cleaned data table */}
            <section aria-label="Cleaned student data">
              <StudentTable
                students={cleanedStudents}
                statusByStudentId={statusByStudentId}
                onToggleStatus={toggleStatus}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
