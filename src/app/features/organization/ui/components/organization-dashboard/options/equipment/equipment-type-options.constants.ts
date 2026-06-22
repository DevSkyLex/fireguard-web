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
    label: $localize`:@@dash.equipType.fireExtinguisher:Fire Extinguisher`,
    value: 'fire_extinguisher',
  },
  {
    label: $localize`:@@dash.equipType.smokeDetector:Smoke Detector`,
    value: 'smoke_detector',
  },
  {
    label: $localize`:@@dash.equipType.heatDetector:Heat Detector`,
    value: 'heat_detector',
  },
  {
    label: $localize`:@@dash.equipType.sprinkler:Sprinkler`,
    value: 'sprinkler',
  },
  {
    label: $localize`:@@dash.equipType.fireAlarmPanel:Fire Alarm Panel`,
    value: 'fire_alarm_panel',
  },
  {
    label: $localize`:@@dash.equipType.hydrant:Hydrant`,
    value: 'hydrant',
  },
  {
    label: $localize`:@@dash.equipType.fireDoor:Fire Door`,
    value: 'fire_door',
  },
  {
    label: $localize`:@@dash.equipType.emergencyLighting:Emergency Lighting`,
    value: 'emergency_lighting',
  },
  {
    label: $localize`:@@dash.equipType.accessControl:Access Control`,
    value: 'access_control',
  },
  {
    label: $localize`:@@dash.equipType.camera:Camera`,
    value: 'camera',
  },
  {
    label: $localize`:@@dash.equipType.gasDetector:Gas Detector`,
    value: 'gas_detector',
  },
  {
    label: $localize`:@@dash.equipType.other:Other`,
    value: 'other',
  },
];
