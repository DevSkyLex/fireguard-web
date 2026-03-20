import type { PaginationOptions } from '@core/models/api';
import type {
  NonConformitySeverity,
  NonConformityStatus,
} from './non-conformity-output.interface';

export interface NonConformityListFilter {
  readonly severity?: NonConformitySeverity;
  readonly status?: NonConformityStatus;
}

export type NonConformityListOptions = NonConformityListFilter & PaginationOptions;
