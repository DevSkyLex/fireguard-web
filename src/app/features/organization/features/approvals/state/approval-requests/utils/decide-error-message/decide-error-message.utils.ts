import { isApiError } from '@core/api/utils';
import type { StoreError } from '@core/request-state';
import { approvalDecisionReason } from '@features/organization/features/approvals/utils';

/**
 * Function decideErrorMessage
 *
 * @description
 * Maps a decide (approve/reject) `StoreError` to specific, actionable copy
 * for the decision dialog using stable API codes. Unknown codes fall back
 * to the normalized message without parsing server prose.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {StoreError} storeError - The normalized decide failure.
 *
 * @returns {string} Specific, user-facing copy for the dialog's inline error.
 */
export function decideErrorMessage(storeError: StoreError): string {
  const code: string | undefined = isApiError(storeError.error) ? storeError.error.code : undefined;

  const reason = approvalDecisionReason(code);
  if (reason) return reason;

  return (
    storeError.message ??
    $localize`:@@approvals.decide.error.generic:The decision could not be recorded. Try again.`
  );
}
