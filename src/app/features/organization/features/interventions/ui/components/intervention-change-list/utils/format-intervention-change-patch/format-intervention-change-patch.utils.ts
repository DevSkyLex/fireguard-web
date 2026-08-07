import type { InterventionChangePatchLine } from '../../models';

/**
 * Function humanizeChangeField
 *
 * @description
 * Turns a patch key such as `locationLabel` into `Location label`.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {string} field - The raw camelCase field name.
 *
 * @returns {string} A capitalized, space-separated label.
 */
function humanizeChangeField(field: string): string {
  const spaced: string = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Function stringifyChangeValue
 *
 * @description
 * Renders a patch value as plain text. The applier's patch is a flat map of
 * `field => newValue` with no "previous value" alongside it (the backend
 * reads the current record before overwriting), so this only ever formats
 * one side — never a JSON blob, and never a bare `[object Object]`.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {unknown} value - The raw patch value.
 *
 * @returns {string} A readable rendering.
 */
function stringifyChangeValue(value: unknown): string {
  if (value === null || value === undefined) return $localize`:@@intervention.changes.noValue:—`;
  if (typeof value === 'boolean')
    return value ? $localize`:@@common.yes:Yes` : $localize`:@@common.no:No`;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(stringifyChangeValue).join(', ');
  if (typeof value === 'object')
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${humanizeChangeField(key)}: ${stringifyChangeValue(entry)}`)
      .join(', ');

  return String(value);
}

/**
 * Function formatInterventionChangePatch
 *
 * @description
 * Turns a proposed change's raw `patch` record into readable `field · value`
 * lines, degrading unknown or nested values to plain text instead of raw
 * JSON so a reviewer can read a proposed change without knowing the
 * resource's internal shape.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Readonly<Record<string, unknown>>} patch - The change's raw patch.
 *
 * @returns {readonly InterventionChangePatchLine[]} One line per patched field.
 */
export function formatInterventionChangePatch(
  patch: Readonly<Record<string, unknown>>,
): readonly InterventionChangePatchLine[] {
  return Object.entries(patch).map(([field, value]) => ({
    field: humanizeChangeField(field),
    value: stringifyChangeValue(value),
  }));
}
