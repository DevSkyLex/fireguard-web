import type {
  ServiceRequestStatus,
  ServiceRequestPriority,
} from '@features/organization/features/service-requests/models';
/**
 * Function serviceRequestStatusLabel
 *
 * @description
 * Localizes canonical request workflow states without inferring completion from another module.
 *
 * @access public
 * @since unreleased
 *
 * @param {ServiceRequestStatus} status - Canonical server workflow status.
 *
 * @returns {string} Localized human-readable request value.
 */
export function serviceRequestStatusLabel(status: ServiceRequestStatus): string {
  switch (status) {
    case 'requested':
      return $localize`:@@serviceRequest.status.requested:Requested`;
    case 'qualified':
      return $localize`:@@serviceRequest.status.qualified:Qualified`;
    case 'rejected':
      return $localize`:@@serviceRequest.status.rejected:Rejected`;
    case 'cancelled':
      return $localize`:@@serviceRequest.status.cancelled:Cancelled`;
    case 'converted':
      return $localize`:@@serviceRequest.status.converted:Converted into work`;
  }
}
/**
 * Function serviceRequestPriorityLabel
 *
 * @description
 * Localizes the declared request priority.
 *
 * @access public
 * @since unreleased
 *
 * @param {ServiceRequestPriority} priority - Canonical declared priority.
 *
 * @returns {string} Localized human-readable request value.
 */
export function serviceRequestPriorityLabel(priority: ServiceRequestPriority): string {
  switch (priority) {
    case 'low':
      return $localize`:@@serviceRequest.priority.low:Low`;
    case 'normal':
      return $localize`:@@serviceRequest.priority.normal:Normal`;
    case 'high':
      return $localize`:@@serviceRequest.priority.high:High`;
    case 'urgent':
      return $localize`:@@serviceRequest.priority.urgent:Urgent`;
  }
}
