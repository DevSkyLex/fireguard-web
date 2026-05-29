import { PrimeIcons } from 'primeng/api';

/**
 * Type FacilityDataviewLayoutOption
 *
 * @description
 * Shape of a single layout toggle option for the facilities dataview.
 */
type FacilityDataviewLayoutOption = {
  icon: string;
  value: 'list' | 'grid';
};

/**
 * Constant FACILITY_DATAVIEW_LAYOUT_OPTIONS
 * @const FACILITY_DATAVIEW_LAYOUT_OPTIONS
 *
 * @description
 * Options for the list/grid layout toggle of the facilities dataview.
 *
 * @type {FacilityDataviewLayoutOption[]}
 */
export const FACILITY_DATAVIEW_LAYOUT_OPTIONS: FacilityDataviewLayoutOption[] = [
  { icon: PrimeIcons.LIST, value: 'list' },
  { icon: PrimeIcons.TH_LARGE, value: 'grid' },
];
