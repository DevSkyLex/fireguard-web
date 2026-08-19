import { isApiError } from '@core/api/utils';
import type { StoreError } from '@core/request-state';

/**
 * Function decideErrorMessage
 *
 * @description
 * Maps a decide (approve/reject) `StoreError` to specific, actionable copy
 * for the decision dialog, distinguishing the backend's documented outcomes
 * by HTTP status and the exception message API Platform surfaces as the
 * RFC 7807 `detail`: **409** either means someone else already decided the
 * request, or — approve only — the deferred action's subject changed state
 * in the meantime (the request is now `cancelled` server-side); **403**
 * either means self-approval is disallowed, or the deciding member is below
 * the action's minimum approver role. Falls back to the normalized
 * `message` for anything else.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {StoreError} storeError - The normalized decide failure.
 *
 * @returns {string} Specific, user-facing copy for the dialog's inline error.
 */
export function decideErrorMessage(storeError: StoreError): string {
  const detail: string | undefined = isApiError(storeError.error)
    ? storeError.error.detail
    : undefined;

  if (storeError.code === 409) {
    return detail?.includes('no longer be applied')
      ? $localize`:@@approvals.decide.error.subjectChanged:This request can no longer be applied — the item it gates has changed since it was requested. It has been cancelled; refresh to see the latest state.`
      : $localize`:@@approvals.decide.error.alreadyDecided:Someone else already decided this request. Refresh to see the outcome.`;
  }

  if (storeError.code === 403) {
    return detail?.includes('own approval request')
      ? $localize`:@@approvals.decide.error.selfApproval:You cannot decide on a request you submitted yourself.`
      : $localize`:@@approvals.decide.error.belowMinRole:Your role does not meet this action's minimum approver requirement.`;
  }

  return (
    storeError.message ??
    $localize`:@@approvals.decide.error.generic:The decision could not be recorded. Try again.`
  );
}
