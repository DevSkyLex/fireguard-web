import type {
  EquipmentOutput,
  EquipmentAttachmentOutput,
  EquipmentTagOutput,
} from '@core/models/equipment';
import type { CollectionOperation, Operation } from '@core/stores/operations';

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
   * Property createOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for the create equipment operation.
   * Starts idle and transitions through loading → success | error when
   * {@link EquipmentStore#create} is called.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentOutput | null, unknown>}
   */
  readonly createOperation: Operation<EquipmentOutput | null, unknown>;

  /**
   * Property updateOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for the update equipment operation.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentOutput | null, unknown>}
   */
  readonly updateOperation: Operation<EquipmentOutput | null, unknown>;

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
  readonly isLoading: boolean;
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
   * @type {Operation<EquipmentOutput | null, unknown>}
   */
  readonly assignToFacilityOperation: Operation<EquipmentOutput | null, unknown>;

  /**
   * Property unassignFromFacilityOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for unassigning equipment from a facility.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentOutput | null, unknown>}
   */
  readonly unassignFromFacilityOperation: Operation<EquipmentOutput | null, unknown>;

  /**
   * Property commissionOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for commissioning equipment.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentOutput | null, unknown>}
   */
  readonly commissionOperation: Operation<EquipmentOutput | null, unknown>;

  /**
   * Property decommissionOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for decommissioning equipment.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentOutput | null, unknown>}
   */
  readonly decommissionOperation: Operation<EquipmentOutput | null, unknown>;

  /**
   * Property maintenanceOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for setting equipment to maintenance.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentOutput | null, unknown>}
   */
  readonly maintenanceOperation: Operation<EquipmentOutput | null, unknown>;
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
   * @type {CollectionOperation<EquipmentAttachmentOutput, unknown>}
   */
  readonly attachmentsListOperation: CollectionOperation<EquipmentAttachmentOutput, unknown>;

  /**
   * Property addAttachmentOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for adding an attachment.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentAttachmentOutput | null, unknown>}
   */
  readonly addAttachmentOperation: Operation<EquipmentAttachmentOutput | null, unknown>;

  /**
   * Property deleteAttachmentOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for deleting an attachment.
   *
   * @since 1.0.0
   *
   * @type {Operation<null, unknown>}
   */
  readonly deleteAttachmentOperation: Operation<null, unknown>;
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
   * @type {CollectionOperation<EquipmentTagOutput, unknown>}
   */
  readonly tagsListOperation: CollectionOperation<EquipmentTagOutput, unknown>;

  /**
   * Property addTagOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for adding a tag.
   *
   * @since 1.0.0
   *
   * @type {Operation<EquipmentTagOutput | null, unknown>}
   */
  readonly addTagOperation: Operation<EquipmentTagOutput | null, unknown>;

  /**
   * Property removeTagOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for removing a tag.
   *
   * @since 1.0.0
   *
   * @type {Operation<null, unknown>}
   */
  readonly removeTagOperation: Operation<null, unknown>;
  //#endregion
}
