import type { FacilityTypeOption } from '../models';
import { PrimeIcons } from 'primeng/api';

/**
 * Constant FACILITY_TYPE_OPTIONS
 * @const FACILITY_TYPE_OPTIONS
 *
 * @description
 * Defines the available facility type options for filtering and display
 * in the organization dashboard.
 * Each option includes a label for display, a corresponding value
 * for internal use, and an icon for visual representation.
 *
 * @type {readonly FacilityTypeOption[]}
 */
export const FACILITY_TYPE_OPTIONS: readonly FacilityTypeOption[] = [
  {
    label: 'Site',
    value: 'site',
    icon: PrimeIcons.MAP_MARKER
  },
  {
    label: 'Building',
    value: 'building',
    icon: PrimeIcons.BUILDING
  },
  {
    label: 'Floor',
    value: 'floor',
    icon: PrimeIcons.TH_LARGE
  },
  {
    label: 'Zone',
    value: 'zone',
    icon: PrimeIcons.STOP
  },
  {
    label: 'Area',
    value: 'area',
    icon: PrimeIcons.TABLE
  },
];
