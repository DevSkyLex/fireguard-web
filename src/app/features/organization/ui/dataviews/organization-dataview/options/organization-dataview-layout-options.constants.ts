import { PrimeIcons } from 'primeng/api';

type OrganizationDataviewLayoutOption = {
	icon: string;
	value: 'list' | 'grid';
};

export const ORGANIZATION_DATAVIEW_LAYOUT_OPTIONS: OrganizationDataviewLayoutOption[] = [
	{ icon: PrimeIcons.LIST, value: 'list' },
	{ icon: PrimeIcons.TH_LARGE, value: 'grid' },
];
