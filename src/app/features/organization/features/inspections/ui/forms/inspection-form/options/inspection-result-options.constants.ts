import type { InspectionResult } from '@features/organization/features/inspections/models';

export const INSPECTION_RESULT_OPTIONS = [
  { label: $localize`:@@inspectionResult.pass:Pass`, value: 'pass' },
  { label: $localize`:@@inspectionResult.fail:Fail`, value: 'fail' },
  { label: $localize`:@@inspectionResult.partial:Partial`, value: 'partial' },
] satisfies ReadonlyArray<{ label: string; value: InspectionResult }>;
