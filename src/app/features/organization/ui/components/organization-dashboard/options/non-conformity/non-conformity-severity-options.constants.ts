import type { NonConformitySeverityOption } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant NON_CONFORMITY_SEVERITY_OPTIONS
 * @const NON_CONFORMITY_SEVERITY_OPTIONS
 *
 * @description
 * Defines the available non-conformity severity options for filtering and display
 * in the organization dashboard. Each option includes a label for display, a corresponding
 * value for internal use, and a color for severity indication.
 *
 * @type {readonly NonConformitySeverityOption[]}
 */
export const NON_CONFORMITY_SEVERITY_OPTIONS: readonly NonConformitySeverityOption[] = [
  {
    label: 'Low',
    value: 'low',
    color: '#22c55e',
  },
  {
    label: 'Medium',
    value: 'medium',
    color: '#eab308',
  },
  {
    label: 'High',
    value: 'high',
    color: '#f97316',
  },
  {
    label: 'Critical',
    value: 'critical',
    color: '#ef4444',
  },
];