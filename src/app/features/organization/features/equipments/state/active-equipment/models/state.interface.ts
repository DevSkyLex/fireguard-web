import type { CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';

/**
 * Interface ActiveEquipmentState
 * @interface ActiveEquipmentState
 *
 * @description
 * Minimal root-level state for the currently selected / active equipment.
 * Only tracks the routing context (which equipment is being viewed) and its
 * associated loading state. All list management, CRUD, lifecycle operations,
 * attachments and tags live in the component-scoped {@link EquipmentStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveEquipmentState {
  //#region Properties
  /**
   * Property selectedOrganizationId
   * @readonly
   *
   * @description
   * Organization owning the current selection, including an in-flight route read.
   *
   * @type {string | null}
   */
  readonly selectedOrganizationId: string | null;

  /**
   * Property selectedEquipmentId
   * @readonly
   *
   * @description
   * Equipment identity selected by the current route.
   *
   * @type {string | null}
   */
  readonly selectedEquipmentId: string | null;

  /**
   * Property selectionGeneration
   * @readonly
   *
   * @description
   * Monotonic selection fence that rejects writes from an earlier dossier visit.
   *
   * @type {number}
   */
  readonly selectionGeneration: number;

  /**
   * Property selectedEquipment
   * @readonly
   *
   * @description
   * Currently selected / viewed equipment (set by
   * resolver or DashboardLayout).
   *
   * @since 1.0.0
   *
   * @type {EquipmentOutput | null}
   */
  readonly selectedEquipment: EquipmentOutput | null;

  /**
   * Property getCallState
   * @readonly
   *
   * @description
   * Call state for fetching the selected equipment.
   * This call state is managed by the resolver and DashboardLayout, not by
   * the store itself, but it's included here for convenience since it's
   * tightly coupled to the selected equipment.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly getCallState: CallState<EquipmentOutput | null>;
  //#endregion
}
