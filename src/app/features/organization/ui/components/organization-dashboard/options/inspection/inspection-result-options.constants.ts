import { PrimeIcons } from 'primeng/api';
import type { InspectionResultOption } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant INSPECTION_RESULT_OPTIONS
 * @const INSPECTION_RESULT_OPTIONS
 *
 * @description
 * Defines the available inspection result options for filtering and display
 * in the organization dashboard. Each option includes a label for display,
 * a corresponding value for internal use, an icon for visual representation,
 * and a color for status indication.
 *
 * @type {readonly InspectionResultOption[]}
 */
export const INSPECTION_RESULT_OPTIONS: readonly InspectionResultOption[] = [
  {
    label: 'Pass',
    value: 'pass',
    icon: PrimeIcons.CHECK_CIRCLE,
    severity: 'success',
    color: '#22c55e',
  },
  {
    label: 'Fail',
    value: 'fail',
    icon: PrimeIcons.TIMES_CIRCLE,
    severity: 'danger',
    color: '#ef4444',
  },
  {
    label: 'Partial',
    value: 'partial',
    icon: PrimeIcons.EXCLAMATION_CIRCLE,
    severity: 'warn',
    color: '#f59e0b',
  },
];
