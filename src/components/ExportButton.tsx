import { formatCount } from "@/utils/formatters";

interface ExportButtonProps {
  onExport: () => void;
  count: number;
  disabled?: boolean;
}

/**
 * Triggers a CSV download of the current shortlist.
 *
 * Shows the current shortlist count in the label so the user knows exactly
 * what will be exported before clicking.
 *
 * Spec reference: docs/01-PROJECT-SPEC.md §6
 *   "Provide a download button for the final shortlist."
 *   "The exported CSV must contain only students who satisfy Active AND Total >= minimum threshold."
 */
export function ExportButton({ onExport, count, disabled }: ExportButtonProps) {
  const isDisabled = disabled || count === 0;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onExport}
        disabled={isDisabled}
        className={[
          "inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
          "text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
          isDisabled
            ? "cursor-not-allowed bg-gray-100 text-gray-400"
            : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
        ].join(" ")}
        aria-label={`Export shortlist of ${formatCount(count)} students as CSV`}
      >
        {/* Download icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        Export Shortlist ({formatCount(count)} student{count !== 1 ? "s" : ""})
      </button>

      {count === 0 && (
        <p className="text-xs text-gray-400">
          No eligible students to export.
        </p>
      )}
    </div>
  );
}
