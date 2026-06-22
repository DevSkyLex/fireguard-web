import { PrimeIcons } from 'primeng/api';
import type { NonConformitySeverityOption } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant NON_CONFORMITY_SEVERITY_OPTIONS
 * @const NON_CONFORMITY_SEVERITY_OPTIONS
 *
 * @description
 * Defines the available non-conformity severity options for filtering and
 * display in the organization dashboard. Each option includes a label, its
 * internal value, an escalation icon and severity colour for the shared
 * `<app-tag>` badge, plus the raw hex `color` consumed by the trend chart.
 *
 * @type {readonly NonConformitySeverityOption[]}
 */
export const NON_CONFORMITY_SEVERITY_OPTIONS: readonly NonConformitySeverityOption[] = [
  {
    label: $localize`:@@ncSeverity.low:Low`,
    value: 'low',
    icon: PrimeIcons.ANGLE_DOWN,
    severity: 'success',
    color: '#22c55e',
  },
  {
    label: $localize`:@@ncSeverity.medium:Medium`,
    value: 'medium',
    icon: PrimeIcons.MINUS,
    severity: 'warn',
    color: '#eab308',
  },
  {
    label: $localize`:@@ncSeverity.high:High`,
    value: 'high',
    icon: PrimeIcons.ANGLE_UP,
    severity: 'warn',
    color: '#f97316',
  },
  {
    label: $localize`:@@ncSeverity.critical:Critical`,
    value: 'critical',
    icon: PrimeIcons.ANGLE_DOUBLE_UP,
    severity: 'danger',
    color: '#ef4444',
  },
];
