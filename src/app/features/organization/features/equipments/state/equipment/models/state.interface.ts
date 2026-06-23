import type { CallState } from '@core/request-state';
import type {
  EquipmentOutput,
  EquipmentAttachmentOutput,
  EquipmentTagOutput,
} from '@features/organization/features/equipments/models';

/**
 * Interface EquipmentState
 * @interface EquipmentState
 *
 * @description
 * Component-scoped state for the equipment list store. Entities are
 * managed by the `withEntities` feature (providing `equipmentEntities`,
 * `equipmentEntityMap`, `equipmentIds`). This interface tracks
 * auxiliary state that does not belong to the entity collection itself:
 * CRUD operation tracking, lifecycle operations, attachments, tags,
 * list loading flags, and total count for pagination.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface EquipmentState {
  //#region Equipment
  /**
   * Property createCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the create equipment operation.
   * Starts idle and transitions through loading → success | error when
   * {@link EquipmentStore#create} is called.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly createCallState: CallState<EquipmentOutput | null>;

  /**
   * Property updateCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the update equipment operation.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly updateCallState: CallState<EquipmentOutput | null>;

  /**
   * Property totalEquipment
   * @readonly
   *
   * @description
   * Server-reported total count of equipment for the current query.
   * Used to drive pagination controls.
   *
   * @since 2.0.0
   *
   * @type {number}
   */
  readonly totalEquipment: number;

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * True while a list request is in-flight.
   *
   * @since 2.0.0
   *
   * @type {boolean}
   */
  readonly listCallState: CallState;
  //#endregion

  //#region Lifecycle
  /**
   * Property assignToFacilityOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for assigning equipment to a facility.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly assignToFacilityCallState: CallState<EquipmentOutput | null>;

  /**
   * Property unassignFromFacilityOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for unassigning equipment from a facility.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly unassignFromFacilityCallState: CallState<EquipmentOutput | null>;

  /**
   * Property commissionOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for commissioning equipment.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly commissionCallState: CallState<EquipmentOutput | null>;

  /**
   * Property decommissionOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for decommissioning equipment.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly decommissionCallState: CallState<EquipmentOutput | null>;

  /**
   * Property maintenanceOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for setting equipment to maintenance.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentOutput | null>}
   */
  readonly maintenanceCallState: CallState<EquipmentOutput | null>;
  //#endregion

  //#region Attachments
  /**
   * Property totalAttachments
   * @readonly
   *
   * @description
   * Total count of attachments for the current equipment.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalAttachments: number;

  /**
   * Property attachmentsListOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for listing attachments.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly attachmentsListCallState: CallState;

  /**
   * Property addAttachmentOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for adding an attachment.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentAttachmentOutput | null>}
   */
  readonly addAttachmentCallState: CallState<EquipmentAttachmentOutput | null>;

  /**
   * Property deleteAttachmentOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for deleting an attachment.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly deleteAttachmentCallState: CallState;
  //#endregion

  //#region Tags
  /**
   * Property totalTags
   * @readonly
   *
   * @description
   * Total count of tags for the current equipment.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalTags: number;

  /**
   * Property tagsListOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for listing tags.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly tagsListCallState: CallState;

  /**
   * Property addTagOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for adding a tag.
   *
   * @since 1.0.0
   *
   * @type {CallState<EquipmentTagOutput | null>}
   */
  readonly addTagCallState: CallState<EquipmentTagOutput | null>;

  /**
   * Property removeTagOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for removing a tag.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly removeTagCallState: CallState;
  //#endregion

  //#region Maintenance logs
  /** Server-reported total maintenance log count for the active query. */
  readonly totalMaintenanceLogs: number;
  /** Tracks the maintenance log list request state. */
  readonly maintenanceLogsListCallState: CallState;
  //#endregion
}
