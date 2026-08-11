import type { FacilityType } from '@features/organization/features/facilities/models';

/**
 * Constant FACILITY_TYPE_OPTIONS
 * @const FACILITY_TYPE_OPTIONS
 *
 * @description
 * Localized select options for the facility hierarchy type picker, shared by
 * the create form and the read-only type row on the record. The backend
 * `FacilityType` value object is a closed set, so entering the type as free
 * text guaranteed a 400 — this constrains the choice to valid values and
 * renders a raw enum such as `fire_extinguisher` as "Fire extinguisher".
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: FacilityType }>}
 */
export const FACILITY_TYPE_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: FacilityType;
}> = [
  { label: $localize`:@@facilityType.site:Site`, value: 'site' },
  { label: $localize`:@@facilityType.building:Building`, value: 'building' },
  { label: $localize`:@@facilityType.floor:Floor`, value: 'floor' },
  { label: $localize`:@@facilityType.zone:Zone`, value: 'zone' },
  { label: $localize`:@@facilityType.area:Area`, value: 'area' },
];
