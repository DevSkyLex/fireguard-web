/**
 * Constant EQUIPMENT_TYPE_OPTIONS
 * @const EQUIPMENT_TYPE_OPTIONS
 *
 * @description
 * Localized `p-select` options for the fire-safety equipment type picker in the
 * onboarding equipment form. Keeping the list in one place renders a raw enum
 * value such as `fire_extinguisher` as "Fire extinguisher" and gives a single
 * place to extend the catalog.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
 */
export const EQUIPMENT_TYPE_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: string;
}> = [
  {
    label: $localize`:@@equipmentType.fireExtinguisher:Fire extinguisher`,
    value: 'fire_extinguisher',
  },
  { label: $localize`:@@equipmentType.smokeDetector:Smoke detector`, value: 'smoke_detector' },
  { label: $localize`:@@equipmentType.heatDetector:Heat detector`, value: 'heat_detector' },
  { label: $localize`:@@equipmentType.sprinkler:Sprinkler`, value: 'sprinkler' },
  { label: $localize`:@@equipmentType.fireAlarmPanel:Fire alarm panel`, value: 'fire_alarm_panel' },
  { label: $localize`:@@equipmentType.hydrant:Hydrant`, value: 'hydrant' },
  { label: $localize`:@@equipmentType.fireDoor:Fire door`, value: 'fire_door' },
  {
    label: $localize`:@@equipmentType.emergencyLighting:Emergency lighting`,
    value: 'emergency_lighting',
  },
  { label: $localize`:@@equipmentType.accessControl:Access control`, value: 'access_control' },
  { label: $localize`:@@equipmentType.camera:Camera`, value: 'camera' },
  { label: $localize`:@@equipmentType.gasDetector:Gas detector`, value: 'gas_detector' },
  { label: $localize`:@@equipmentType.other:Other`, value: 'other' },
];
