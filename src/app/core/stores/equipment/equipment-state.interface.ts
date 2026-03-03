import type {
  EquipmentOutput,
  EquipmentAttachmentOutput,
  EquipmentTagOutput,
} from '@core/models/equipment';
import type { CollectionOperation, Operation } from '@core/stores/operations';

export interface EquipmentState {
  //#region Equipment
  readonly totalEquipment: number;
  readonly selectedEquipment: EquipmentOutput | null;
  readonly listOperation: CollectionOperation<EquipmentOutput, unknown>;
  readonly getOperation: Operation<EquipmentOutput | null, unknown>;
  readonly createOperation: Operation<EquipmentOutput | null, unknown>;
  readonly updateOperation: Operation<EquipmentOutput | null, unknown>;
  //#endregion

  //#region Lifecycle
  readonly assignToFacilityOperation: Operation<EquipmentOutput | null, unknown>;
  readonly unassignFromFacilityOperation: Operation<EquipmentOutput | null, unknown>;
  readonly commissionOperation: Operation<EquipmentOutput | null, unknown>;
  readonly decommissionOperation: Operation<EquipmentOutput | null, unknown>;
  readonly maintenanceOperation: Operation<EquipmentOutput | null, unknown>;
  //#endregion

  //#region Attachments
  readonly totalAttachments: number;
  readonly attachmentsListOperation: CollectionOperation<EquipmentAttachmentOutput, unknown>;
  readonly addAttachmentOperation: Operation<EquipmentAttachmentOutput | null, unknown>;
  readonly deleteAttachmentOperation: Operation<null, unknown>;
  //#endregion

  //#region Tags
  readonly totalTags: number;
  readonly tagsListOperation: CollectionOperation<EquipmentTagOutput, unknown>;
  readonly addTagOperation: Operation<EquipmentTagOutput | null, unknown>;
  readonly removeTagOperation: Operation<null, unknown>;
  //#endregion
}
