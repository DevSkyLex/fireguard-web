import type { InspectorType } from '@features/organization/features/inspections/models';

export const INSPECTOR_TYPE_OPTIONS = [
  { label: $localize`:@@inspectorTypeOption.user:Internal User`, value: 'user' },
  { label: $localize`:@@inspectorTypeOption.external:External Inspector`, value: 'external' },
] satisfies ReadonlyArray<{ label: string; value: InspectorType }>;
