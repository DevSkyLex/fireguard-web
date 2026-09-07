/**
 * Function parseOrganizationDashboardPeriodBoundary
 *
 * @description
 * Parses an inclusive API date-only boundary in local calendar time so the
 * displayed dashboard period does not move across a day in negative UTC
 * offsets. Full timestamps retain their explicit offset semantics.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - ISO date or timestamp returned by the dashboard API.
 * @returns {Date} Parsed boundary, or an invalid Date for malformed input.
 */
export function parseOrganizationDashboardPeriodBoundary(value: string): Date {
  const dateOnly: RegExpMatchArray | null = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly === null) return new Date(value);

  const year: number = Number(dateOnly[1]);
  const month: number = Number(dateOnly[2]);
  const day: number = Number(dateOnly[3]);
  const parsed: Date = new Date(year, month - 1, day);

  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : new Date(Number.NaN);
}
