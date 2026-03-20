import type { PaginationOptions } from '@core/models/api';
import type { ChecklistStatus } from './checklist-output.interface';

export type ChecklistStatusFilter = ChecklistStatus;

export type ChecklistListOptions = PaginationOptions & {
  readonly status?: ChecklistStatusFilter;
};
