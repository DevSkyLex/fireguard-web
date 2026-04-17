import { PrimeIcons } from 'primeng/api';

/**
 * Constant FACILITY_TYPE_ICONS
 * @const FACILITY_TYPE_ICONS
 *
 * @description
 * Mapping of facility types to PrimeIcons for
 * display in the UI.
 *
 * @type {Record<string, string>}
 */
export const FACILITY_TYPE_ICONS: Record<string, string> = {
  site: PrimeIcons.GLOBE,
  building: PrimeIcons.BUILDING,
  floor: PrimeIcons.TH_LARGE,
  zone: PrimeIcons.MAP,
  area: PrimeIcons.MAP_MARKER,
};
