import { PrimeIcons } from 'primeng/api';

type FacilityDataviewLayoutOption = {
  icon: string;
  value: 'list' | 'grid';
};

export const FACILITY_DATAVIEW_LAYOUT_OPTIONS: FacilityDataviewLayoutOption[] = [
  { icon: PrimeIcons.LIST, value: 'list' },
  { icon: PrimeIcons.TH_LARGE, value: 'grid' },
];
