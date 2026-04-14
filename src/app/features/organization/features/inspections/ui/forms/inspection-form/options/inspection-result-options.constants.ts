import type { InspectionResult } from '@features/organization/features/inspections/models';

export const INSPECTION_RESULT_OPTIONS = [
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Partial', value: 'partial' },
] satisfies ReadonlyArray<{ label: string; value: InspectionResult }>;
