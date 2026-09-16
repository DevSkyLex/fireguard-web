import type {
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';

/**
 * Interface InterventionInspectionsTableQuery
 * @interface InterventionInspectionsTableQuery
 * @description Controlled criteria for linked inspections, retained in page state.
 * @since 6.2.0
 */
export interface InterventionInspectionsTableQuery {
  readonly search: string;
  readonly status: InspectionStatus | null;
  readonly result: InspectionResult | null;
}
