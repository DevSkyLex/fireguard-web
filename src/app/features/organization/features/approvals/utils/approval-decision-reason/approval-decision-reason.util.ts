/**
 * Function approvalDecisionReason
 * @description Translates the server's stable decision refusal code for lists and dialogs.
 * @access public
 * @since 1.0.0
 * @param {string | null | undefined} code - Backend capability or problem code.
 * @returns {string | null} Localized reason, or null for an unknown code.
 */
export function approvalDecisionReason(code: string | null | undefined): string | null {
  switch (code) {
    case 'approval_subject_changed':
      return $localize`:@@approvals.decide.error.subjectChanged:This request can no longer be applied — the item it gates has changed since it was requested. It has been cancelled; refresh to see the latest state.`;
    case 'approval_not_pending':
      return $localize`:@@approvals.decide.error.alreadyDecided:Someone else already decided this request. Refresh to see the outcome.`;
    case 'approval_self_decision_forbidden':
      return $localize`:@@approvals.decide.error.selfApproval:You cannot decide on a request you submitted yourself.`;
    case 'approval_role_required':
      return $localize`:@@approvals.decide.error.belowMinRole:Your role does not meet this action's minimum approver requirement.`;
    case 'approval_withdrawal_forbidden':
      return $localize`:@@approvals.decide.error.withdrawalForbidden:Only the requester with active organization access can withdraw this request.`;
    case 'approval_permission_required':
      return $localize`:@@approvals.decide.error.permissionRequired:You no longer have permission to decide on this request.`;
    case 'approval_expired':
      return $localize`:@@approvals.decide.error.expired:This request has expired and can no longer be decided.`;
    default:
      return null;
  }
}
