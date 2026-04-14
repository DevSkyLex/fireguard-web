import type { InspectorType } from '@features/organization/features/inspections/models';

export const INSPECTOR_TYPE_OPTIONS = [
  { label: 'Internal User', value: 'user' },
  { label: 'External Inspector', value: 'external' },
] satisfies ReadonlyArray<{ label: string; value: InspectorType }>;
