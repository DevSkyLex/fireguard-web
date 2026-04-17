import { PrimeIcons } from 'primeng/api';

type EquipmentTableLayoutOption = {
  icon: string;
  value: 'list' | 'grid';
};

export const EQUIPMENT_TABLE_LAYOUT_OPTIONS: EquipmentTableLayoutOption[] = [
  { icon: PrimeIcons.LIST, value: 'list' },
  { icon: PrimeIcons.TH_LARGE, value: 'grid' },
];
