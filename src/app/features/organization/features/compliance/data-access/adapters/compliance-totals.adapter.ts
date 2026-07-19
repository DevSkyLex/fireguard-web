import type { ComplianceTotals } from '@features/organization/features/compliance/models';

/**
 * The organization rollup, in the order the register reads.
 *
 * @since 1.0.0
 */
export interface ComplianceRollup {
  readonly totalEquipmentCount: number;
  readonly trackedEquipmentCount: number;
  readonly upToDateEquipmentCount: number;
  readonly dueSoonEquipmentCount: number;
  readonly overdueEquipmentCount: number;
  readonly unscheduledEquipmentCount: number;
  readonly complianceRate: number | null;
  readonly openCriticalNonConformityCount: number;
  readonly openHighNonConformityCount: number;
  readonly openMediumNonConformityCount: number;
  readonly openLowNonConformityCount: number;
}

/** Every counter that is a plain integer, defaulting to zero when absent. */
const COUNTERS = [
  'totalEquipmentCount',
  'trackedEquipmentCount',
  'upToDateEquipmentCount',
  'dueSoonEquipmentCount',
  'overdueEquipmentCount',
  'unscheduledEquipmentCount',
  'openCriticalNonConformityCount',
  'openHighNonConformityCount',
  'openMediumNonConformityCount',
  'openLowNonConformityCount',
] as const;

/**
 * Normalizes the organization rollup out of the loosely-typed `totals` map.
 *
 * The API types this bag as `array<string, int|float|null>`, so every key is
 * probed rather than trusted — the exact case ARCHITECTURE §17.6 keeps out of
 * `computed` blocks.
 *
 * `complianceRate` keeps `null` rather than collapsing to `0`: the backend
 * returns it undefined when nothing is tracked, and "no schedule yet" must not
 * render as "0% compliant".
 *
 * @param {ComplianceTotals | undefined} totals - The raw `totals` map.
 *
 * @returns {ComplianceRollup} The normalized rollup.
 */
export function adaptComplianceTotals(totals: ComplianceTotals | undefined): ComplianceRollup {
  const read = (key: string): number => {
    const value: number | null | undefined = totals?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };

  const rate: number | null | undefined = totals?.['complianceRate'];

  const counters = Object.fromEntries(
    COUNTERS.map((key: string): readonly [string, number] => [key, read(key)]),
  ) as Omit<ComplianceRollup, 'complianceRate'>;

  return {
    ...counters,
    complianceRate: typeof rate === 'number' && Number.isFinite(rate) ? rate : null,
  };
}
