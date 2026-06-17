import { PrimeIcons } from 'primeng/api';
import type { NonConformityStatusOption } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant NON_CONFORMITY_STATUS_OPTIONS
 * @const NON_CONFORMITY_STATUS_OPTIONS
 *
 * @description
 * Defines the available non-conformity status options for
 * filtering and display in the organization dashboard.
 * Each option includes a label for display, a corresponding
 * value for internal use, an icon for visual representation,
 * and a color for status indication.
 *
 * @type {readonly NonConformityStatusOption[]}
 */
export const NON_CONFORMITY_STATUS_OPTIONS: readonly NonConformityStatusOption[] = [
  {
    label: 'Open',
    value: 'open',
    icon: PrimeIcons.EXCLAMATION_CIRCLE,
    severity: 'danger',
    color: '#ef4444',
  },
  {
    label: 'In Progress',
    value: 'in_progress',
    icon: PrimeIcons.SPINNER,
    severity: 'warn',
    color: '#f97316',
  },
  {
    label: 'Done',
    value: 'done',
    icon: PrimeIcons.CHECK_CIRCLE,
    severity: 'success',
    color: '#22c55e',
  },
  {
    label: 'Waived',
    value: 'waived',
    icon: PrimeIcons.MINUS_CIRCLE,
    severity: 'secondary',
    color: '#94a3b8',
  },
];
