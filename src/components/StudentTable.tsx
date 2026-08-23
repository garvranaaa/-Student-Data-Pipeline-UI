import type { Student, StudentStatus } from "@/types/student";

interface StudentTableProps {
  students: Student[];
  statusByStudentId: Map<string, StudentStatus>;
  onToggleStatus: (studentId: string) => void;
}

/**
 * Displays ALL cleaned students (not just the shortlist).
 *
 * Debarred students remain visible here — they are only excluded from the
 * derived shortlist. This makes the Active/Debarred behavior transparent.
 *
 * Performance notes:
 *   - Uses student.studentId as React key (never array index).
 *   - Table is in a scrollable container to keep the page layout stable.
 *   - thead is sticky so headers are always visible while scrolling.
 *   - Status computed per-row from the Map override (O(1) lookup).
 *
 * Spec reference: docs/01-PROJECT-SPEC.md §5
 *   "Every cleaned student must have an interactive status control."
 *   "They must remain visible in the cleaned table."
 */
export function StudentTable({
  students,
  statusByStudentId,
  onToggleStatus,
}: StudentTableProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No student records to display.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Cleaned Dataset
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({students.length.toLocaleString()} students)
          </span>
        </h2>
        <p className="text-xs text-gray-400">
          Toggle status to Debar / re-enable a student
        </p>
      </div>

      {/* Outer scroll container — horizontal + vertical */}
      <div className="overflow-x-auto">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                {[
                  "Name",
                  "Gender",
                  "Grade",
                  "Math",
                  "Science",
                  "English",
                  "Total",
                  "Status",
                ].map((col) => (
                  <th
                    key={col}
                    className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => {
                const effectiveStatus = statusByStudentId.get(s.studentId) ?? s.status;
                const isDebarred = effectiveStatus === "Debarred";

                return (
                  <tr
                    key={s.studentId}
                    className={[
                      "transition-colors",
                      isDebarred
                        ? "bg-red-50/50 text-gray-400"
                        : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 data-[debarred]:text-gray-400" data-debarred={isDebarred || undefined}>
                      {s.name}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{s.gender}</td>
                    <td className="px-4 py-2 tabular-nums text-gray-600">{s.grade}</td>
                    <td className="px-4 py-2 tabular-nums text-gray-600">{s.math}</td>
                    <td className="px-4 py-2 tabular-nums text-gray-600">{s.science}</td>
                    <td className="px-4 py-2 tabular-nums text-gray-600">{s.english}</td>
                    <td className="px-4 py-2 tabular-nums font-semibold text-gray-700">
                      {s.total}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(s.studentId)}
                        aria-label={`Toggle status for ${s.name} — currently ${effectiveStatus}`}
                        className={[
                          "rounded-full px-3 py-0.5 text-xs font-semibold transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-offset-1",
                          isDebarred
                            ? "bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-300"
                            : "bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-300",
                        ].join(" ")}
                      >
                        {effectiveStatus}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
