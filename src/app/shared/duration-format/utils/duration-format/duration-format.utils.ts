/**
 * Function formatDurationMinutes
 * @function formatDurationMinutes
 *
 * @description
 * Formats integral effort as hours/minutes without conflating missing values and zero.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number | null | undefined} value - Integral minutes, or unknown.
 * @returns {string} Localized duration or the standard missing-value dash.
 */
export function formatDurationMinutes(value: number | null | undefined): string {
  if (value == null || !Number.isInteger(value) || value < 0) return '—';
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  if (!hours) return $localize`:@@duration.minutes:${minutes}:minutes: min`;
  if (!minutes) return $localize`:@@duration.hours:${hours}:hours: h`;
  return $localize`:@@duration.hoursMinutes:${hours}:hours: h ${minutes}:minutes: min`;
}
