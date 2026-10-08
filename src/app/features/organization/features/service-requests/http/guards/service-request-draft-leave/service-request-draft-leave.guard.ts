import type { CanDeactivateFn } from '@angular/router';

/**
 * Function serviceRequestDraftLeaveGuard
 *
 * @description
 * Delegates route and browser-history dismissal to the request page's active draft policy.
 *
 * @access public
 * @since unreleased
 *
 * @param {object} component - Request page that owns the draft and accepted-write decision.
 *
 * @returns {boolean | Promise<boolean>} Whether the current request workspace may be destroyed.
 */
export const serviceRequestDraftLeaveGuard: CanDeactivateFn<{
  canLeaveDraft(): boolean | Promise<boolean>;
}> = (component) => component.canLeaveDraft();
