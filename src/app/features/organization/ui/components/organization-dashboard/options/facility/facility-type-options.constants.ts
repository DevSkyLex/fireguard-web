import { PrimeIcons } from 'primeng/api';
import type { FacilityTypeOption } from '@features/organization/ui/components/organization-dashboard/models';

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
    label: $localize`:@@facilityType.site:Site`,
    value: 'site',
    icon: PrimeIcons.MAP_MARKER,
  },
  {
    label: $localize`:@@facilityType.building:Building`,
    value: 'building',
    icon: PrimeIcons.BUILDING,
  },
  {
    label: $localize`:@@facilityType.floor:Floor`,
    value: 'floor',
    icon: PrimeIcons.TH_LARGE,
  },
  {
    label: $localize`:@@facilityType.zone:Zone`,
    value: 'zone',
    icon: PrimeIcons.STOP,
  },
  {
    label: $localize`:@@facilityType.area:Area`,
    value: 'area',
    icon: PrimeIcons.TABLE,
  },
];
