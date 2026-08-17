import type { CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { InspectionOutput } from '@features/organization/features/inspections/models';

/**
 * State backing the intervention detail page's "Linked" tabs — three
 * independent async concerns (facilities, equipment, inspections), each
 * loaded lazily on its own tab activation and cached per intervention.
 */
export interface InterventionLinkedResourcesState {
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

  /** Lifecycle of the linked-equipment fetch. */
  readonly equipmentCallState: CallState<readonly EquipmentOutput[]>;

  /** One-based page of linked equipment currently loaded. */
  readonly equipmentPage: number;

  /** Total linked equipment reported by the server, across all pages. */
  readonly equipmentTotalItems: number;

  /** Whether an additional page of linked equipment is being fetched. */
  readonly equipmentLoadingMore: boolean;

  /** Lifecycle of the linked-inspections fetch. */
  readonly inspectionsCallState: CallState<readonly InspectionOutput[]>;

  /** One-based page of linked inspections currently loaded. */
  readonly inspectionsPage: number;

  /** Total linked inspections reported by the server, across all pages. */
  readonly inspectionsTotalItems: number;

  /** Whether an additional page of linked inspections is being fetched. */
  readonly inspectionsLoadingMore: boolean;
}
