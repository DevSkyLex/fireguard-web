import type {
  FacilityStatus,
  FacilityType,
} from '@features/organization/features/facilities/models';

/**
 * Interface InterventionFacilitiesTableQuery
 * @interface InterventionFacilitiesTableQuery
 * @description Controlled criteria for linked facilities, retained in page state.
 * @since 6.2.0
 */
export interface InterventionFacilitiesTableQuery {
  readonly search: string;
  readonly type: FacilityType | null;
  readonly status: FacilityStatus | null;
}
