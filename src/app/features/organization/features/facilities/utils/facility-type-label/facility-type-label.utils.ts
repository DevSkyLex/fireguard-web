import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';

/**
 * Function facilityTypeLabel
 * @function facilityTypeLabel
 *
 * @description
 * Resolves a raw facility type into its localized label from
 * {@link FACILITY_TYPE_OPTIONS} — the one lookup every facility surface
 * (grid, table, hierarchy chart, plan overlays, information panel) shares,
 * so an unrecognized value never leaks the raw enum string or a
 * differently-humanized guess depending on which surface rendered it.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} type - The raw facility type value.
 *
 * @returns {string} The localized label, or a localized "Unknown type" fallback.
 */
export function facilityTypeLabel(type: string): string {
  return (
    FACILITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    $localize`:@@common.unknownType:Unknown type`
  );
}
