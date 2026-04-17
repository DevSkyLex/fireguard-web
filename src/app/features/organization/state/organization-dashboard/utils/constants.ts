import type { GranularityOption } from '../models';

export const GRANULARITY_OPTIONS: readonly GranularityOption[] = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
];

export const toIsoString = (value: Date | undefined): string | undefined => value?.toISOString();

export const getDashboardInitialDateRange = (): [Date, Date] => [
  new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
  new Date(),
];

