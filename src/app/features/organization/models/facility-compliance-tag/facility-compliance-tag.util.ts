import type { ComplianceBucketDescriptor } from './facility-compliance-tag-descriptor.interface';

const GOOD: ComplianceBucketDescriptor = {
  bucket: 'good',
  label: $localize`:@@map.compliance.good:Good`,
  pinColor: '#22c55e',
  barClass: 'bg-green-500',
  textClass: 'text-green-600 dark:text-green-400',
};

const WARNING: ComplianceBucketDescriptor = {
  bucket: 'warning',
  label: $localize`:@@map.compliance.warning:Needs attention`,
  pinColor: '#f59e0b',
  barClass: 'bg-amber-500',
  textClass: 'text-amber-600 dark:text-amber-400',
};

const CRITICAL: ComplianceBucketDescriptor = {
  bucket: 'critical',
  label: $localize`:@@map.compliance.critical:Critical`,
  pinColor: '#ef4444',
  barClass: 'bg-red-500',
  textClass: 'text-red-600 dark:text-red-400',
};

const UNMEASURED: ComplianceBucketDescriptor = {
  bucket: 'unmeasured',
  label: $localize`:@@map.compliance.unmeasured:Not yet measured`,
  pinColor: '#94a3b8',
  barClass: 'bg-surface-300 dark:bg-surface-600',
  textClass: 'text-surface-500 dark:text-surface-400',
};

/**
 * The three measured buckets, in display order, for the map legend. Excludes
 * {@link UNMEASURED}: the legend explains what a colored pin means, not the
 * absence of one.
 */
export const COMPLIANCE_BUCKET_LEGEND: readonly ComplianceBucketDescriptor[] = [
  GOOD,
  WARNING,
  CRITICAL,
];

/**
 * Resolves a facility's compliance rate to its bucket descriptor.
 *
 * `null` (not `0`) is a facility tracking no scheduled equipment — the
 * backend is explicit that the two are different facts — so it resolves to
 * {@link UNMEASURED} rather than sorting as failing.
 *
 * @param rate - Compliance percentage (0–100), or `null` when unmeasured.
 * @returns The matching bucket descriptor.
 */
export function resolveComplianceBucket(rate: number | null): ComplianceBucketDescriptor {
  if (rate === null) return UNMEASURED;
  if (rate >= 90) return GOOD;
  if (rate >= 75) return WARNING;
  return CRITICAL;
}
