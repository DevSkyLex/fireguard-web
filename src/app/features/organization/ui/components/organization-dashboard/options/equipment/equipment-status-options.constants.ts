import { PrimeIcons } from 'primeng/api';
import type { EquipmentStatusOption } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant EQUIPMENT_STATUS_OPTIONS
 * @const EQUIPMENT_STATUS_OPTIONS
 *
 * @description
 * Defines the available equipment status options for
 * filtering and display in the organization dashboard.
 *
 * @type {readonly EquipmentStatusOption[]}
 */
export const EQUIPMENT_STATUS_OPTIONS: readonly EquipmentStatusOption[] = [
  {
    label: 'In Stock',
    value: 'in_stock',
    icon: PrimeIcons.BOX,
    color: '#94a3b8',
  },
  {
    label: 'Operational',
    value: 'operational',
    icon: PrimeIcons.CHECK_CIRCLE,
    color: '#22c55e',
  },
  {
    label: 'Under Maintenance',
    value: 'under_maintenance',
    icon: PrimeIcons.WRENCH,
    color: '#f97316',
  },
  {
    label: 'Decommissioned',
    value: 'decommissioned',
    icon: PrimeIcons.BAN,
    color: '#ef4444',
  },
];
