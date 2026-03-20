import type { PaginationOptions } from '@core/models/api';
import type { InspectionResult, InspectionStatus } from './inspection-output.interface';

export interface InspectionListFilter {
  readonly equipmentId?: string;
  readonly facilityId?: string;
  readonly result?: InspectionResult;
  readonly status?: InspectionStatus;
}

export type InspectionListOptions = InspectionListFilter & PaginationOptions;
