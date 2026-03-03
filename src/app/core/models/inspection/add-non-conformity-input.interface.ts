import type { NonConformitySeverity } from './non-conformity-output.interface';

export interface AddNonConformityInput {
  readonly description: string;
  readonly severity: NonConformitySeverity;
  readonly dueAt?: string | null;
  readonly notes?: string | null;
}
