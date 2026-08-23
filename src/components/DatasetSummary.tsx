import type { CleaningMetadata, InvalidRecord } from "@/types/student";
import { formatCount } from "@/utils/formatters";

interface DatasetSummaryProps {
  metadata: CleaningMetadata;
  invalidRecords: InvalidRecord[];
}

interface StatItemProps {
  label: string;
  value: number | string;
  highlight?: "green" | "amber" | "red" | "neutral";
}

function StatItem({ label, value, highlight = "neutral" }: StatItemProps) {
  const colorMap = {
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
    neutral: "text-gray-900",
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${colorMap[highlight]}`}>
        {typeof value === "number" ? formatCount(value) : value}
      </span>
    </div>
  );
}

/**
 * Displays the cleaning pipeline metadata after a successful upload.
 *
 * Shows original vs cleaned counts, duplicates removed, invalid rows,
 * total corrections, and normalisation counts. This makes the pipeline's
 * activity transparent and demonstrates that real cleaning occurred.
 *
 * Spec reference: docs/01-PROJECT-SPEC.md §7
 *   "how many records were processed … duplicate count … invalid/problematic records"
 */
export function DatasetSummary({ metadata, invalidRecords }: DatasetSummaryProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
        Cleaning Summary
      </h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatItem label="Uploaded rows" value={metadata.originalRowCount} />
        <StatItem label="Cleaned rows" value={metadata.cleanedRowCount} highlight="green" />
        <StatItem
          label="Duplicates removed"
          value={metadata.duplicatesRemoved}
          highlight={metadata.duplicatesRemoved > 0 ? "amber" : "neutral"}
        />
        <StatItem
          label="Invalid rows"
          value={metadata.invalidRowCount}
          highlight={metadata.invalidRowCount > 0 ? "red" : "neutral"}
        />
        <StatItem
          label="Total corrections"
          value={metadata.totalCorrections}
          highlight={metadata.totalCorrections > 0 ? "amber" : "neutral"}
        />
        <StatItem label="Name fixes" value={metadata.nameNormalizations} />
        <StatItem label="Mark fixes" value={metadata.markNormalizations} />
      </div>

      {invalidRecords.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-red-600 hover:underline">
            {invalidRecords.length} rejected row{invalidRecords.length !== 1 ? "s" : ""} — click to
            inspect
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-red-50 p-3">
            {invalidRecords.map((r, i) => (
              <p key={i} className="text-xs text-red-700">
                <span className="font-medium">Row {r.rowIndex + 1}:</span> {r.reason}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
