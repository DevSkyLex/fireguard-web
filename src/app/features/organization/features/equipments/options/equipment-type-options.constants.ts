import type { EquipmentType } from '@features/organization/features/equipments/models';

/**
 * Constant EQUIPMENT_TYPE_OPTIONS
 *
 * @description
 * Localized historical labels and icons used to decorate the server catalog.
 * Production equipment pages obtain their allowed choices from the organization catalog.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{
 *   readonly icon: string;
 *   readonly label: string;
 *   readonly value: EquipmentType;
 * }>}
 *
 * @constant EQUIPMENT_TYPE_OPTIONS
 */
export const EQUIPMENT_TYPE_OPTIONS: ReadonlyArray<{
  readonly icon: string;
  readonly label: string;
  readonly value: EquipmentType;
}> = [
  {
    icon: 'lucideFireExtinguisher',
    label: $localize`:@@equipmentType.fireExtinguisher:Fire extinguisher`,
    value: 'fire_extinguisher',
  },
  {
    icon: 'lucideAlarmSmoke',
    label: $localize`:@@equipmentType.smokeDetector:Smoke detector`,
    value: 'smoke_detector',
  },
  {
    icon: 'lucideThermometer',
    label: $localize`:@@equipmentType.heatDetector:Heat detector`,
    value: 'heat_detector',
  },
  {
    icon: 'lucideDroplets',
    label: $localize`:@@equipmentType.sprinkler:Sprinkler`,
    value: 'sprinkler',
  },
  {
    icon: 'lucideSiren',
    label: $localize`:@@equipmentType.fireAlarmPanel:Fire alarm panel`,
    value: 'fire_alarm_panel',
  },
  {
    icon: 'lucideDroplet',
    label: $localize`:@@equipmentType.hydrant:Hydrant`,
    value: 'hydrant',
  },
  {
    icon: 'lucideDoorClosed',
    label: $localize`:@@equipmentType.fireDoor:Fire door`,
    value: 'fire_door',
  },
  {
    icon: 'lucideLightbulb',
    label: $localize`:@@equipmentType.emergencyLighting:Emergency lighting`,
    value: 'emergency_lighting',
  },
  {
    icon: 'lucideFingerprint',
    label: $localize`:@@equipmentType.accessControl:Access control`,
    value: 'access_control',
  },
  { icon: 'lucideCctv', label: $localize`:@@equipmentType.camera:Camera`, value: 'camera' },
  {
    icon: 'lucideGauge',
    label: $localize`:@@equipmentType.gasDetector:Gas detector`,
    value: 'gas_detector',
  },
  { icon: 'lucideBox', label: $localize`:@@equipmentType.other:Other`, value: 'other' },
];
