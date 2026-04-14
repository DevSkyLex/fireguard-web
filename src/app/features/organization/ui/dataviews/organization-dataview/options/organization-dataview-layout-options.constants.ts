import { PrimeIcons } from 'primeng/api';

export const ORGANIZATION_DATAVIEW_LAYOUT_OPTIONS: ReadonlyArray<{
  icon: string;
  value: 'list' | 'grid'
}> = [
	{ icon: PrimeIcons.LIST, value: 'list' },
	{ icon: PrimeIcons.TH_LARGE, value: 'grid' },
] as const;
