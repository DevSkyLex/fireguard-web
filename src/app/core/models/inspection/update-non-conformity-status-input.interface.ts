import type { NonConformityStatus } from './non-conformity-output.interface';

export interface UpdateNonConformityStatusInput {
  readonly status?: NonConformityStatus;
}
