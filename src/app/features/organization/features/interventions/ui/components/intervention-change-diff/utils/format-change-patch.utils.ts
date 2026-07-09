import type { ChangePatchEntry } from '../models';

/**
 * Function formatChangePatch
 * @function formatChangePatch
 *
 * @description
 * Turns a raw proposed-change patch (`Record<string, unknown>` straight from the
 * API) into an ordered list of human-readable rows — a humanized field label and
 * a formatted proposed value — so the review panel can render a legible diff
 * instead of raw JSON. Unknown value shapes fall back to a compact JSON string.
 *
 * @since 1.0.0
 *
 * @param {Readonly<Record<string, unknown>> | null | undefined} patch - Raw patch map.
 *
 * @returns {readonly ChangePatchEntry[]} One entry per patched field.
 */
export function formatChangePatch(
  patch: Readonly<Record<string, unknown>> | null | undefined,
): readonly ChangePatchEntry[] {
  if (!patch) return [];

  return Object.entries(patch).map(
    ([key, value]: [string, unknown]): ChangePatchEntry => ({
      field: humanizeFieldKey(key),
      value: formatPatchValue(value),
    }),
  );
}

/**
 * Converts a `snake_case` or `camelCase` field key into a sentence-case label.
 *
 * @param {string} key - Raw patch field key.
 * @returns {string} Humanized label.
 */
function humanizeFieldKey(key: string): string {
  const spaced: string = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Formats a raw patch value as a compact display string.
 *
 * @param {unknown} value - Raw patch value.
 * @returns {string} Display string; an em dash for null/undefined.
 */
function formatPatchValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
