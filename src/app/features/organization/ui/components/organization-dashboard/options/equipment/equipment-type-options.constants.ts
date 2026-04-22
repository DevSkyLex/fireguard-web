import type { EquipmentTypeOption } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant EQUIPMENT_TYPE_OPTIONS
 * @const EQUIPMENT_TYPE_OPTIONS
 *
 * @description
 * Defines the available equipment type options for filtering and display
 * in the organization dashboard. Each option includes a label for display
 * and a corresponding value for internal use.
 *
 * @type {readonly EquipmentTypeOption[]}
 */
export const EQUIPMENT_TYPE_OPTIONS: readonly EquipmentTypeOption[] = [
  {
    label: 'Fire Extinguisher',
    value: 'fire_extinguisher',
  },
  {
    label: 'Smoke Detector',
    value: 'smoke_detector',
  },
  {
    label: 'Heat Detector',
    value: 'heat_detector',
  },
  {
    label: 'Sprinkler',
    value: 'sprinkler',
  },
  {
    label: 'Fire Alarm Panel',
    value: 'fire_alarm_panel',
  },
  {
    label: 'Hydrant',
    value: 'hydrant',
  },
  {
    label: 'Fire Door',
    value: 'fire_door',
  },
  {
    label: 'Emergency Lighting',
    value: 'emergency_lighting',
  },
  {
    label: 'Access Control',
    value: 'access_control',
  },
  {
    label: 'Camera',
    value: 'camera',
  },
  {
    label: 'Gas Detector',
    value: 'gas_detector',
  },
  {
    label: 'Other',
    value: 'other',
  },
];
