import { PrimeIcons } from 'primeng/api';

type InspectionTableLayoutOption = {
  icon: string;
  value: 'list' | 'grid';
};

export const INSPECTION_TABLE_LAYOUT_OPTIONS: InspectionTableLayoutOption[] = [
  { icon: PrimeIcons.LIST, value: 'list' },
  { icon: PrimeIcons.TH_LARGE, value: 'grid' },
];
