import type { WorkloadAssessment } from '@features/organization/features/workload/models';

/**
 * Function workloadAssessmentFromError
 *
 * @description
 * Validates the public conflict contract before offering a consequential confirmation.
 *
 * @since 1.0.0
 *
 * @param {unknown} error - Transport error or persisted conflict.
 * @returns {WorkloadAssessment | null} Assessment requiring explicit consent.
 */
export function workloadAssessmentFromError(error: unknown): WorkloadAssessment | null {
  if (!error || typeof error !== 'object' || !('assessment' in error)) return null;
  const value = error.assessment;
  if (
    !value ||
    typeof value !== 'object' ||
    !('confirmationRequired' in value) ||
    value.confirmationRequired !== true ||
    !('confirmationToken' in value) ||
    typeof value.confirmationToken !== 'string' ||
    !value.confirmationToken ||
    !('completeness' in value) ||
    !['complete', 'partial', 'unavailable'].includes(String(value.completeness)) ||
    !('increases' in value) ||
    !Array.isArray(value.increases)
  )
    return null;
  if (
    !value.increases.every(
      (row: unknown) =>
        row !== null &&
        typeof row === 'object' &&
        'memberId' in row &&
        typeof row.memberId === 'string' &&
        row.memberId.length > 0 &&
        (!('memberName' in row) || typeof row.memberName === 'string') &&
        'beforeMinutes' in row &&
        typeof row.beforeMinutes === 'number' &&
        Number.isFinite(row.beforeMinutes) &&
        row.beforeMinutes >= 0 &&
        'afterMinutes' in row &&
        typeof row.afterMinutes === 'number' &&
        Number.isFinite(row.afterMinutes) &&
        row.afterMinutes > row.beforeMinutes &&
        'reason' in row &&
        typeof row.reason === 'string' &&
        (!('date' in row) || row.date === null || typeof row.date === 'string') &&
        (!('capacityMinutes' in row) ||
          row.capacityMinutes === null ||
          (typeof row.capacityMinutes === 'number' &&
            Number.isFinite(row.capacityMinutes) &&
            row.capacityMinutes >= 0)),
    )
  )
    return null;
  return value as WorkloadAssessment;
}
