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

  /** Lifecycle of the linked-equipment fetch. */
  readonly equipmentCallState: CallState<readonly EquipmentOutput[]>;

  /** Lifecycle of the linked-inspections fetch. */
  readonly inspectionsCallState: CallState<readonly InspectionOutput[]>;
}
