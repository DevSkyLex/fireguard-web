import type { ApprovalRequestOutput } from '@features/organization/features/approvals/models';
import type { ApprovalDecisionMode } from './approval-decision-mode.type';

/**
 * Interface ApprovalDecisionTarget
 *
 * @description
 * What {@link ApprovalDecisionDialog} is confirming — the row and which of
 * the two decisions was activated. `null` keeps the dialog closed, so open
 * state and target are the same signal, never two that could disagree.
 *
 * @since 1.0.0
 */
export interface ApprovalDecisionTarget {
  /** @type {ApprovalDecisionMode} */
  readonly mode: ApprovalDecisionMode;
  /** @type {ApprovalRequestOutput} */
  readonly request: ApprovalRequestOutput;
}
