import type { ShortlistStats } from "@/services/statistics";
import { formatAvg, formatCount } from "@/utils/formatters";

interface StatisticsCardsProps {
  stats: ShortlistStats;
  totalStudents: number;
  debarredCount: number;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function Card({ label, value, sub, accent = "bg-white" }: CardProps) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border border-gray-200 p-4 shadow-sm ${accent}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

/**
 * Displays shortlist statistics that update live on every filter/status change.
 *
 * Spec reference: docs/01-PROJECT-SPEC.md §4
 *   "The interface must display useful statistics, including at minimum:
 *    matched student count, average score."
 *
 * All values derived from the current shortlist via computeStats().
 */
export function StatisticsCards({ stats, totalStudents, debarredCount }: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <Card
        label="Shortlisted"
        value={formatCount(stats.matchedCount)}
        sub="Active & qualifying"
        accent="bg-blue-50 border-blue-200"
      />
      <Card
        label="Avg Total"
        value={stats.matchedCount > 0 ? formatAvg(stats.averageTotal) : "—"}
        sub="out of 300"
      />
      <Card
        label="Avg Math"
        value={stats.matchedCount > 0 ? formatAvg(stats.averageMath) : "—"}
        sub="out of 100"
      />
      <Card
        label="Avg Science"
        value={stats.matchedCount > 0 ? formatAvg(stats.averageScience) : "—"}
        sub="out of 100"
      />
      <Card
        label="Avg English"
        value={stats.matchedCount > 0 ? formatAvg(stats.averageEnglish) : "—"}
        sub="out of 100"
      />
      <Card
        label="Total students"
        value={formatCount(totalStudents)}
        sub="in dataset"
      />
      <Card
        label="Debarred"
        value={formatCount(debarredCount)}
        sub="excluded"
        accent={debarredCount > 0 ? "bg-red-50 border-red-200" : "bg-white"}
      />
    </div>
  );
}
