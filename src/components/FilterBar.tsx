import { type ChangeEvent } from "react";
import { formatCount } from "@/utils/formatters";

interface FilterBarProps {
  minimumTotal: number;
  onChange: (value: number) => void;
  shortlistCount: number;
  totalCleaned: number;
}

/**
 * Controls the minimum Total score threshold and shows shortlist count.
 *
 * Updates on every input change (live). The onChange callback receives
 * a clamped integer — never a string, never NaN.
 *
 * Spec reference: docs/01-PROJECT-SPEC.md §4
 *   "The application must provide an input for a minimum Total score.
 *    The shortlist must update immediately when the threshold changes."
 */
export function FilterBar({
  minimumTotal,
  onChange,
  shortlistCount,
  totalCleaned,
}: FilterBarProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10);
    const clamped = isNaN(raw) ? 0 : Math.max(0, raw);
    onChange(clamped);
  }

  const pct =
    totalCleaned > 0 ? Math.round((shortlistCount / totalCleaned) * 100) : 0;

  return (
    <div className="flex flex-wrap items-end gap-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Input control */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="minimum-total-input"
          className="text-sm font-semibold text-gray-700"
        >
          Minimum Total Score
          <span className="ml-1.5 text-xs font-normal text-gray-400">(0 – 300)</span>
        </label>
        <input
          id="minimum-total-input"
          type="number"
          min={0}
          step={1}
          value={minimumTotal}
          onChange={handleChange}
          className={[
            "w-36 rounded-lg border border-gray-300 px-3 py-2",
            "text-sm font-medium tabular-nums text-gray-900",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200",
          ].join(" ")}
          aria-label="Minimum Total Score threshold"
        />
      </div>

      {/* Shortlist summary */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Qualifying students
        </span>
        <p className="text-2xl font-bold tabular-nums text-gray-900">
          {formatCount(shortlistCount)}
          <span className="ml-1.5 text-sm font-normal text-gray-400">
            / {formatCount(totalCleaned)}
          </span>
          <span className="ml-2 text-sm font-medium text-blue-600">
            ({pct}%)
          </span>
        </p>
      </div>
    </div>
  );
}
