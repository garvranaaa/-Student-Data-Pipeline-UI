// ============================================================
// Display Formatters
// ============================================================

/**
 * Formats a numeric average to a fixed number of decimal places.
 * Defaults to 1 decimal place.
 *
 * @example formatAvg(184.333)    → "184.3"
 * @example formatAvg(100, 0)     → "100"
 * @example formatAvg(0)          → "0.0"
 */
export function formatAvg(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

/**
 * Formats an integer count with locale-aware thousand separators.
 *
 * @example formatCount(3000)  → "3,000"
 * @example formatCount(1234)  → "1,234"
 * @example formatCount(0)     → "0"
 */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
