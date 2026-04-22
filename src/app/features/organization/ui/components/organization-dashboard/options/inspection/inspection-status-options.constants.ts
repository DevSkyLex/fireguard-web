import { PrimeIcons } from 'primeng/api';
import type { InspectionStatusOption } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant INSPECTION_STATUS_OPTIONS
 * @const INSPECTION_STATUS_OPTIONS
 *
 * @description
 * Defines the available inspection status options for filtering and display
 * in the organization dashboard. Each option includes a label for display,
 * a corresponding value for internal use, an icon for visual representation,
 * and a color for status indication.
 *
 * @type {readonly InspectionStatusOption[]}
 */
export const INSPECTION_STATUS_OPTIONS: readonly InspectionStatusOption[] = [
  {
    label: 'Draft',
    value: 'draft',
    icon: PrimeIcons.FILE_EDIT,
    color: '#3b82f6',
  },
  {
    label: 'Submitted',
    value: 'submitted',
    icon: PrimeIcons.SEND,
    color: '#f59e0b',
  },
  {
    label: 'Closed',
    value: 'closed',
    icon: PrimeIcons.LOCK,
    color: '#64748b',
  },
];
