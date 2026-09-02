import type {
  FacilityOption,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';

/**
 * Function toFacilityOption
 * @function toFacilityOption
 *
 * @description
 * Maps a facility to the shape every facility picker renders: name first,
 * then the localized type and the ancestor path so two "Boiler room"s read
 * differently. The path excludes the facility itself. Pure, so the same
 * facility always yields the same option and no template repeats this.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {FacilityOutput} facility - The facility to offer.
 *
 * @returns {FacilityOption} The picker option.
 */
export function toFacilityOption(facility: FacilityOutput): FacilityOption {
  const typeLabel: string =
    FACILITY_TYPE_OPTIONS.find((option) => option.value === facility.type)?.label ?? '';
  const ancestors: readonly string[] = (facility.path ?? [])
    .filter((segment) => segment.id !== facility.id)
    .map((segment) => segment.name);

  return {
    value: facility.id,
    label: facility.name,
    typeLabel,
    pathLabel: ancestors.length > 0 ? ancestors.join(' › ') : null,
    address: facility.address ?? null,
  };
}
