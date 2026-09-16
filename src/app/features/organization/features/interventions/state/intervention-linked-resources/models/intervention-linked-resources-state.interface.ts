import type { CallState } from '@core/request-state';
import type {
  EquipmentOutput,
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import type {
  FacilityOutput,
  FacilityStatus,
  FacilityType,
} from '@features/organization/features/facilities/models';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import type { InterventionTableSource } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionLinkedResourcesState
 * @interface InterventionLinkedResourcesState
 * @description State backing three independently loaded linked-resource tables per intervention.
 * @since 6.2.0
 */
export interface InterventionLinkedResourcesState {
  readonly online: boolean;
  readonly activeResource: 'facilities' | 'equipment' | 'inspections' | null;
  readonly facilitiesSource: InterventionTableSource;
  readonly facilitiesGeneration: number;
  readonly facilitiesInvalidated: boolean;
  readonly facilitiesFailedPage: number | null;
  readonly equipmentGeneration: number;
  readonly equipmentSource: InterventionTableSource;
  readonly equipmentInvalidated: boolean;
  readonly equipmentFailedPage: number | null;
  readonly inspectionsGeneration: number;
  readonly inspectionsSource: InterventionTableSource;
  readonly inspectionsInvalidated: boolean;
  readonly inspectionsFailedPage: number | null;
  /**
   * The intervention the current cached data belongs to, or `null` before
   * any tab has ever loaded. A mismatch against the requested intervention
   * id is what drives the three call states back to idle on prev/next
   * navigation.
   */
  readonly loadedForInterventionId: string | null;

  /** Lifecycle of the linked-facilities fetch. */
  readonly facilitiesCallState: CallState<readonly FacilityOutput[]>;

  /** One-based page of linked facilities currently loaded. */
  readonly facilitiesPage: number;

  /** Total linked facilities reported by the server, across all pages. */
  readonly facilitiesTotalItems: number;

  /** Whether an additional page of linked facilities is being fetched. */
  readonly facilitiesLoadingMore: boolean;
  readonly facilitiesSearch: string;
  readonly facilitiesType: FacilityType | null;
  readonly facilitiesStatus: FacilityStatus | null;

  /** Lifecycle of the linked-equipment fetch. */
  readonly equipmentCallState: CallState<readonly EquipmentOutput[]>;

  /** One-based page of linked equipment currently loaded. */
  readonly equipmentPage: number;

  /** Total linked equipment reported by the server, across all pages. */
  readonly equipmentTotalItems: number;

  /** Whether an additional page of linked equipment is being fetched. */
  readonly equipmentLoadingMore: boolean;
  readonly equipmentSearch: string;
  readonly equipmentType: EquipmentType | null;
  readonly equipmentStatus: EquipmentStatus | null;

  /** Lifecycle of the linked-inspections fetch. */
  readonly inspectionsCallState: CallState<readonly InspectionOutput[]>;

  /** One-based page of linked inspections currently loaded. */
  readonly inspectionsPage: number;

  /** Total linked inspections reported by the server, across all pages. */
  readonly inspectionsTotalItems: number;

  /** Whether an additional page of linked inspections is being fetched. */
  readonly inspectionsLoadingMore: boolean;
  readonly inspectionsSearch: string;
  readonly inspectionsStatus: InspectionStatus | null;
  readonly inspectionsResult: InspectionResult | null;
}
