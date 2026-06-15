import type { NonConformitySeverity } from '@features/organization/features/inspections/models';

/** Values emitted by the non-conformity form. */
export interface NonConformityFormValues {
  readonly description: string;
  readonly severity: NonConformitySeverity;
  readonly dueAt: Date | null;
  readonly notes: string;
}
