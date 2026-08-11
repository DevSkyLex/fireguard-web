import type { SetupFacilityType } from '@features/organization/setup';

/**
 * Constant ONBOARDING_FACILITY_TYPE_OPTIONS
 * @const ONBOARDING_FACILITY_TYPE_OPTIONS
 *
 * @description
 * Localized select options for the `create_first_facility` step's type
 * picker. A local copy of the facilities subfeature's own option list rather
 * than a shared import: onboarding's lint-enforced import surface stops at
 * `@features/organization/features/equipments` (`FEATURE.md` "Cross-Feature
 * Dependencies"), so `facilities/options` is a private path from here. The
 * values match {@link SetupFacilityType}, the setup boundary's own closed set.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: SetupFacilityType }>}
 */
export const ONBOARDING_FACILITY_TYPE_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: SetupFacilityType;
}> = [
  { label: $localize`:@@onboarding.facilityType.site:Site`, value: 'site' },
  { label: $localize`:@@onboarding.facilityType.building:Building`, value: 'building' },
  { label: $localize`:@@onboarding.facilityType.floor:Floor`, value: 'floor' },
  { label: $localize`:@@onboarding.facilityType.zone:Zone`, value: 'zone' },
  { label: $localize`:@@onboarding.facilityType.area:Area`, value: 'area' },
];
