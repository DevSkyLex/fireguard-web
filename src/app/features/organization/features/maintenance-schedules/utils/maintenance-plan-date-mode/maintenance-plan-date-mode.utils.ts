import type { MaintenancePlanOutput } from '@features/organization/features/maintenance-schedules/models';

/**
 * Function maintenancePlanDateMode
 *
 * @description
 * Fixed calendar anchors are date-only values; historical deadlines retain their instant timezone.
 *
 * @access public
 * @since unreleased
 *
 * @param {MaintenancePlanOutput} plan - Backend-owned cadence definition.
 *
 * @returns {'dateOnly' | 'date'} The rendering mode, without calculating any deadline.
 */
export function maintenancePlanDateMode(plan: MaintenancePlanOutput): 'dateOnly' | 'date' {
  return plan.cadenceMode === 'fixed' ? 'dateOnly' : 'date';
}

/**
 * Function maintenancePlanDateValue
 *
 * @description
 * Preserves the calendar day written by the server for a fixed plan, including offset and DST
 * changes. Historical deadlines remain instants. This adapter does not calculate any deadline.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} value - A server deadline with its calendar timezone offset.
 * @param {MaintenancePlanOutput} plan - Backend-owned cadence definition.
 *
 * @returns {string} The fixed calendar date or unchanged historical instant.
 */
export function maintenancePlanDateValue(value: string, plan: MaintenancePlanOutput): string {
  return plan.cadenceMode === 'fixed' ? value.split('T')[0] : value;
}
