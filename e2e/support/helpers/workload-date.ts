/**
 * Function workloadDate
 * @description Formats a fixture's calendar day for the English workload button's accessible name.
 * @access public
 * @since 1.0.0
 * @param {string} date - ISO calendar day, independent of the host's timezone.
 * @returns {string} Fully spelled-out calendar date.
 */
export function workloadDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
