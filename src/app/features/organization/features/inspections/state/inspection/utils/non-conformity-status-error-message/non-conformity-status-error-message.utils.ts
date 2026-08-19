import type { StoreError } from '@core/request-state';

/**
 * Function nonConformityStatusErrorMessage
 * @function nonConformityStatusErrorMessage
 *
 * @description
 * Maps a non-conformity status-write `StoreError` to specific, actionable
 * copy: **409** always means `done`/`waived` is immutable — the reader tried
 * to reopen an already-resolved non-conformity, a race the store answers by
 * refreshing the row — so this returns the "already resolved" copy rather
 * than a generic failure. Any other status (notably a **403** denying the
 * `organization.approvals.request` permission a gated waive additionally
 * requires) falls back to the normalized `message`, which already carries
 * the backend's RFC 7807 `detail` verbatim.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {StoreError} storeError - The normalized status-write failure.
 *
 * @returns {string} Specific, user-facing copy for the row's inline error.
 */
export function nonConformityStatusErrorMessage(storeError: StoreError): string {
  if (storeError.code === 409) {
    return $localize`:@@inspection.nc.status.error.alreadyResolved:This non-conformity is already resolved — the row has been refreshed.`;
  }

  return (
    storeError.message ??
    $localize`:@@inspection.nc.status.error.generic:The status could not be updated.`
  );
}
