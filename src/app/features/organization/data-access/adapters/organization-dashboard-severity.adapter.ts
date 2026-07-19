import type { NonConformitySeverity } from '@features/organization/features/inspections/models';

/**
 * One severity bucket of the organization's open non-conformities.
 *
 * @since 1.0.0
 */
export interface NonConformitySeverityBucket {
  readonly severity: NonConformitySeverity;
  readonly count: number;
}

/**
 * Highest severity first — the prototype's "By severity" card reads top-down
 * from the most urgent bucket.
 */
const SEVERITY_ORDER: ReadonlyArray<readonly [NonConformitySeverity, string]> = [
  ['critical', 'severityCritical'],
  ['high', 'severityHigh'],
  ['medium', 'severityMedium'],
  ['low', 'severityLow'],
];

/**
 * Extracts the non-conformity severity breakdown from a dashboard payload.
 *
 * The API surfaces every integer of the `nonConformities` widget as one
 * `{ key, value }` entry of a flat `summary` list — status counts and severity
 * counts side by side — so the severity buckets have to be picked out by key.
 * That probing is exactly what ARCHITECTURE §17.6 keeps in an adapter instead
 * of scattering it across `computed` blocks.
 *
 * Buckets absent from the payload read as zero rather than disappearing: a
 * severity with no open non-conformity is information, and a bar chart that
 * silently drops rows misreports the shape of the backlog.
 *
 * @param {unknown} summary the `overview.nonConformities.summary` list
 *
 * @returns {readonly NonConformitySeverityBucket[]} the four buckets, worst first
 */
export function adaptNonConformitySeverity(
  summary: unknown,
): readonly NonConformitySeverityBucket[] {
  const entries: readonly unknown[] = Array.isArray(summary) ? summary : [];
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;

    const key: unknown = (entry as Record<string, unknown>)['key'];
    const value: unknown = (entry as Record<string, unknown>)['value'];

    if (typeof key === 'string' && typeof value === 'number') {
      counts.set(key, value);
    }
  }

  return SEVERITY_ORDER.map(
    ([severity, key]): NonConformitySeverityBucket => ({
      severity,
      count: counts.get(key) ?? 0,
    }),
  );
}
