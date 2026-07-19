/**
 * One status bucket of the organization's equipment fleet.
 *
 * @since 1.0.0
 */
export interface EquipmentStatusBucket {
  readonly status: string;
  readonly count: number;
}

/**
 * The four statuses the API reports, in fleet-health order.
 *
 * `total` is deliberately absent: it is the sum of the others, and feeding it
 * to a composition chart would draw a slice as large as the whole chart.
 */
const STATUS_KEYS: readonly string[] = [
  'operational',
  'under_maintenance',
  'in_stock',
  'decommissioned',
];

/**
 * Extracts the equipment status breakdown from a dashboard payload.
 *
 * The API flattens the `equipment` widget into one `{ key, value }` list where
 * the per-status counts sit next to the `total`, so the statuses have to be
 * picked out by key — the probing ARCHITECTURE §17.6 keeps in an adapter.
 *
 * A status absent from the payload reads as zero rather than disappearing: an
 * empty bucket is information about the fleet, and a chart that silently drops
 * slices misreports its composition.
 *
 * @param {unknown} summary the `overview.equipment.summary` list
 *
 * @returns {readonly EquipmentStatusBucket[]} the four buckets, healthiest first
 */
export function adaptEquipmentStatus(summary: unknown): readonly EquipmentStatusBucket[] {
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

  return STATUS_KEYS.map(
    (status: string): EquipmentStatusBucket => ({ status, count: counts.get(status) ?? 0 }),
  );
}
