import { QUOTA_NEAR_LIMIT_RATIO } from '@features/organization/constants';
import type { QuotaStatus } from '@features/organization/models';

/**
 * Constant QUOTA_EXCEEDED_STATUS
 *
 * @description
 * HTTP status the API returns when a create request is rejected because the
 * organization's current plan limit for the resource has been reached.
 *
 * @since 1.0.0
 */
const QUOTA_EXCEEDED_STATUS = 409;

/**
 * Function resolveQuotaStatus
 * @function resolveQuotaStatus
 *
 * @description
 * Classifies a capped resource's consumption against its plan limit. A `null`
 * limit means the resource is unlimited and is always `ok`; otherwise the status
 * is `full` once usage reaches the limit, `near` once usage reaches the
 * {@link QUOTA_NEAR_LIMIT_RATIO} threshold, and `ok` below it.
 *
 * @since 1.0.0
 *
 * @param {number} used - Current usage count for the resource.
 * @param {number | null} limit - Plan limit for the resource, or `null` when unlimited.
 *
 * @returns {QuotaStatus} The resolved quota status.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function resolveQuotaStatus(used: number, limit: number | null): QuotaStatus {
  if (limit === null || limit <= 0) {
    return 'ok';
  }

  if (used >= limit) {
    return 'full';
  }

  return used / limit >= QUOTA_NEAR_LIMIT_RATIO ? 'near' : 'ok';
}

/**
 * Function quotaUsageColor
 * @function quotaUsageColor
 *
 * @description
 * Resolves the meter colour for a quota status: red at the limit, orange near
 * it, and the primary brand colour otherwise. Returns a CSS variable so the
 * value follows the active PrimeNG theme and dark mode.
 *
 * @since 1.0.0
 *
 * @param {QuotaStatus} status - The resolved quota status.
 *
 * @returns {string} A CSS colour value (PrimeNG theme variable).
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function quotaUsageColor(status: QuotaStatus): string {
  switch (status) {
    case 'full':
      return 'var(--p-red-500)';
    case 'near':
      return 'var(--p-orange-400)';
    default:
      return 'var(--p-primary-color)';
  }
}

/**
 * Function isQuotaExceededError
 * @function isQuotaExceededError
 *
 * @description
 * Determines whether a failed async call represents a plan quota being
 * exceeded, i.e. the API rejected a create request with HTTP 409. Accepts any
 * carrier of the normalized error `code`, so it works with both a `StoreError`
 * and a dispatched `StoreFailureEventPayload`.
 *
 * @since 1.0.0
 *
 * @param {{ code: string | number | null }} error - The normalized failure to inspect.
 *
 * @returns {boolean} `true` when the error is a quota-exceeded (409) failure.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function isQuotaExceededError(error: { readonly code: string | number | null }): boolean {
  return error.code === QUOTA_EXCEEDED_STATUS;
}
