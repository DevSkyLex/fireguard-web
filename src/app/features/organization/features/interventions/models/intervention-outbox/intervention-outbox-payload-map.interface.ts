import type { CreateEquipmentInput } from '@features/organization/features/equipments/models';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import type { CreateInspectionInput } from '@features/organization/features/inspections/models';
import type { InterventionAttachmentKind } from '../intervention-attachment/intervention-attachment-kind.type';
import type { CreateInterventionChangeInput } from '../intervention-change/create-intervention-change-input.interface';
import type { UpdateInterventionChangeInput } from '../intervention-change/update-intervention-change-input.interface';
import type { WriteInterventionTimeEntryInput } from '../intervention-time/write-intervention-time-entry-input.interface';
import type { CreateInterventionWorkItemInput } from '../intervention-work-item/create-intervention-work-item-input.interface';
import type { UpdateInterventionWorkItemInput } from '../intervention-work-item/update-intervention-work-item-input.interface';
import type { InterventionOutput } from '../intervention/intervention-output.interface';
import type { InterventionStatus } from '../intervention/intervention-status.type';

/**
 * Interface InterventionOutboxPayloadMap
 * @interface InterventionOutboxPayloadMap
 *
 * @description
 * Associates every queued operation with its persisted payload contract.
 *
 * @version 1.0.0
 */
export interface InterventionOutboxPayloadMap {
  /**
   * Property 'time-entry.create'
   * @readonly
   *
   * @description
   * Queues a manual time entry with its work item, actor, and optional client id for idempotent
   * replay.
   *
   * @access public
   *
   * @type {WriteInterventionTimeEntryInput & {
   *   readonly workItemId: string;
   *   readonly actorId: string;
   *   readonly clientId?: string;
   * }}
   */
  readonly 'time-entry.create': WriteInterventionTimeEntryInput & {
    readonly workItemId: string;
    readonly actorId: string;
    readonly clientId?: string;
  };

  /**
   * Property 'time-entry.correct'
   * @readonly
   *
   * @description
   * Queues a revision-checked correction to an existing work item time entry.
   *
   * @access public
   *
   * @type {WriteInterventionTimeEntryInput & {
   *   readonly workItemId: string;
   *   readonly actorId: string;
   *   readonly revision: number;
   *   readonly clientId?: string;
   * }}
   */
  readonly 'time-entry.correct': WriteInterventionTimeEntryInput & {
    readonly workItemId: string;
    readonly actorId: string;
    readonly revision: number;
    readonly clientId?: string;
  };

  /**
   * Property 'time-entry.cancel'
   * @readonly
   *
   * @description
   * Queues a revision-checked cancellation of an existing time entry.
   *
   * @access public
   *
   * @type {{
   *   readonly id: string;
   *   readonly workItemId: string;
   *   readonly actorId: string;
   *   readonly revision: number;
   *   readonly clientId?: string;
   * }}
   */
  readonly 'time-entry.cancel': {
    readonly id: string;
    readonly workItemId: string;
    readonly actorId: string;
    readonly revision: number;
    readonly clientId?: string;
  };

  /**
   * Property 'facility.create'
   * @readonly
   *
   * @description
   * Carries the facility creation fields for offline replay.
   *
   * @access public
   *
   * @type {CreateFacilityInput}
   */
  readonly 'facility.create': CreateFacilityInput;

  /**
   * Property 'equipment.create'
   * @readonly
   *
   * @description
   * Carries the equipment creation fields for offline replay.
   *
   * @access public
   *
   * @type {CreateEquipmentInput}
   */
  readonly 'equipment.create': CreateEquipmentInput;

  /**
   * Property 'inspection.create'
   * @readonly
   *
   * @description
   * Carries the inspection creation fields for offline replay.
   *
   * @access public
   *
   * @type {CreateInspectionInput}
   */
  readonly 'inspection.create': CreateInspectionInput;

  /**
   * Property 'media.create'
   * @readonly
   *
   * @description
   * Queues an equipment media file and its filename for upload.
   *
   * @access public
   *
   * @type {{
   *   readonly clientId?: string;
   *   readonly equipmentId: string;
   *   readonly file: Blob;
   *   readonly fileName: string;
   * }}
   */
  readonly 'media.create': {
    readonly clientId?: string;
    readonly equipmentId: string;
    readonly file: Blob;
    readonly fileName: string;
  };

  /**
   * Property 'attachment.upload'
   * @readonly
   *
   * @description
   * Queues a file upload with its MIME type, size, optional label, and optional work-item
   * association.
   *
   * @access public
   *
   * @type {{
   *   readonly clientId?: string;
   *   readonly file: Blob;
   *   readonly fileName: string;
   *   readonly mimeType: string;
   *   readonly size: number;
   *   readonly label?: string;
   *   readonly workItemId?: string;
   *   readonly kind?: InterventionAttachmentKind;
   * }}
   */
  readonly 'attachment.upload': {
    readonly clientId?: string;
    readonly file: Blob;
    readonly fileName: string;
    readonly mimeType: string;
    readonly size: number;
    readonly label?: string;
    readonly workItemId?: string;
    readonly kind?: InterventionAttachmentKind;
  };

  /**
   * Property 'comment.create'
   * @readonly
   *
   * @description
   * Queues the comment body for creation, with an optional client id for replay.
   *
   * @access public
   *
   * @type {{ readonly clientId?: string; readonly body: string }}
   */
  readonly 'comment.create': {
    readonly clientId?: string;
    readonly body: string;
  };

  /**
   * Property 'intervention.update'
   * @readonly
   *
   * @description
   * Carries the partial intervention fields and revision data submitted by an update.
   *
   * @access public
   *
   * @type {Partial<{
   *   readonly clientId: string;
   *   readonly revision: number;
   *   readonly name: string;
   *   readonly status: InterventionStatus;
   *   readonly site: string | null;
   *   readonly responsible: string | null;
   *   readonly participants: readonly string[];
   *   readonly priority: InterventionOutput['priority'];
   *   readonly plannedStartAt: string | null;
   *   readonly dueAt: string | null;
   *   readonly reviewNote: string | null;
   *   readonly description: string | null;
   *   readonly labelIds: readonly string[];
   *   readonly workloadConfirmationToken: string;
   * }>}
   */
  readonly 'intervention.update': Partial<{
    readonly clientId: string;
    readonly revision: number;
    readonly name: string;
    readonly status: InterventionStatus;
    readonly site: string | null;
    readonly responsible: string | null;
    readonly participants: readonly string[];
    readonly priority: InterventionOutput['priority'];
    readonly plannedStartAt: string | null;
    readonly dueAt: string | null;
    readonly reviewNote: string | null;
    readonly description: string | null;
    readonly labelIds: readonly string[];
    readonly workloadConfirmationToken: string;
  }>;

  /**
   * Property 'work-item.create'
   * @readonly
   *
   * @description
   * Carries the work-item creation fields for offline replay.
   *
   * @access public
   *
   * @type {CreateInterventionWorkItemInput}
   */
  readonly 'work-item.create': CreateInterventionWorkItemInput;

  /**
   * Property 'work-item.update'
   * @readonly
   *
   * @description
   * Carries work-item changes together with its identifier and optional revision for replay.
   *
   * @access public
   *
   * @type {UpdateInterventionWorkItemInput & {
   *   readonly clientId?: string;
   *   readonly workItemId: string;
   *   readonly revision?: number;
   * }}
   */
  readonly 'work-item.update': UpdateInterventionWorkItemInput & {
    readonly clientId?: string;
    readonly workItemId: string;
    readonly revision?: number;
  };

  /**
   * Property 'change.create'
   * @readonly
   *
   * @description
   * Carries the proposed intervention change fields for offline replay.
   *
   * @access public
   *
   * @type {CreateInterventionChangeInput}
   */
  readonly 'change.create': CreateInterventionChangeInput;

  /**
   * Property 'change.update'
   * @readonly
   *
   * @description
   * Carries change updates together with the change identifier and optional revision for replay.
   *
   * @access public
   *
   * @type {UpdateInterventionChangeInput & {
   *   readonly clientId?: string;
   *   readonly changeId: string;
   *   readonly revision?: number;
   * }}
   */
  readonly 'change.update': UpdateInterventionChangeInput & {
    readonly clientId?: string;
    readonly changeId: string;
    readonly revision?: number;
  };
}
