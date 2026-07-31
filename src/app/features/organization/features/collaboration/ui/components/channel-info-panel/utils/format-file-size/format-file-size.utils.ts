const UNITS: readonly string[] = ['B', 'kB', 'MB', 'GB'];

/**
 * Function formatFileSize
 * @function formatFileSize
 *
 * @description
 * Renders a byte count in the largest unit that keeps it under 1024, with one
 * decimal from kB up.
 *
 * Deliberately not localized: the units are SI symbols and the panel has room
 * for a compact string, not a spelled-out one.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number} bytes - Size in bytes, as reported by the API.
 *
 * @returns {string} A compact size, e.g. `1.4 MB`.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  let size: number = bytes;
  let unit = 0;

  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return unit === 0 ? `${Math.round(size)} ${UNITS[unit]}` : `${size.toFixed(1)} ${UNITS[unit]}`;
}
