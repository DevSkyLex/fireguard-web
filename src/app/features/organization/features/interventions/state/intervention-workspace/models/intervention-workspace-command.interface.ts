import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import type {
  CreateInterventionWorkItemInput,
  InterventionAttachmentKind,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
  UpdateInterventionInput,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionDetailsUpdateCommand
 * @interface InterventionDetailsUpdateCommand
 *
 * @description
 * Command used to update intervention planning details.
 *
 * @since 1.0.0
 */
export interface InterventionDetailsUpdateCommand {
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Captured revision retained during overload confirmation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly revision?: number;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Carries the values submitted to intervention details update.
   *
   * @access public
   *
   * @type {UpdateInterventionInput}
   */
  readonly input: UpdateInterventionInput;
}

/**
 * Interface InterventionWorkItemCreateCommand
 * @interface InterventionWorkItemCreateCommand
 *
 * @description
 * Command used to create an intervention work item.
 *
 * @since 1.0.0
 */
export interface InterventionWorkItemCreateCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Carries the values submitted to intervention work item create.
   *
   * @access public
   *
   * @type {CreateInterventionWorkItemInput}
   */
  readonly input: CreateInterventionWorkItemInput;
}

/**
 * Interface InterventionWorkItemStatusCommand
 * @interface InterventionWorkItemStatusCommand
 *
 * @description
 * Command used to update an intervention work item status.
 *
 * @since 1.0.0
 */
export interface InterventionWorkItemStatusCommand extends InterventionWorkItemStatusChange {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;
}

/**
 * Interface InterventionCommentAddCommand
 * @interface InterventionCommentAddCommand
 *
 * @description
 * Command used to post a comment onto an intervention's activity timeline.
 *
 * @since 1.2.0
 */
export interface InterventionCommentAddCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Contains the message text shown in the conversation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly body: string;
}

/**
 * Interface InterventionChangeRejectCommand
 * @interface InterventionChangeRejectCommand
 *
 * @description
 * Command used to reject one proposed intervention change. The change's
 * revision is read from the store at dispatch time, mirroring how work-item
 * writes resolve theirs.
 *
 * @since 4.2.0
 */
export interface InterventionChangeRejectCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property changeId
   * @readonly
   *
   * @description
   * Identifies the change associated with this intervention change reject.
   *
   * @access public
   *
   * @type {string}
   */
  readonly changeId: string;
}

/**
 * Interface InterventionAttachmentUploadCommand
 * @interface InterventionAttachmentUploadCommand
 *
 * @description
 * Command used to upload one attachment. The file arrives pre-compressed
 * when it came from the camera; the page owns that step. An optional
 * `workItemId` scopes the upload as evidence for one work item; an optional
 * `kind` of `'signature'` uploads the typed completion signature instead of
 * a plain evidence file (Phase 5d.2).
 *
 * @since 4.4.0
 */
export interface InterventionAttachmentUploadCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property file
   * @readonly
   *
   * @description
   * Contains the selected file being uploaded.
   *
   * @access public
   *
   * @type {Blob}
   */
  readonly file: Blob;

  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Provides the original name of the selected file.
   *
   * @access public
   *
   * @type {string}
   */
  readonly fileName: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this intervention attachment upload.
   *
   * @access public
   *
   * @type {string}
   */
  readonly label?: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Identifies the work item associated with this intervention attachment upload.
   *
   * @access public
   *
   * @type {string}
   */
  readonly workItemId?: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the intervention attachment upload variant represented by this value.
   *
   * @access public
   *
   * @type {InterventionAttachmentKind}
   */
  readonly kind?: InterventionAttachmentKind;
}

/**
 * Interface InterventionWorkItemDeleteCommand
 * @interface InterventionWorkItemDeleteCommand
 *
 * @description
 * Command used to delete one or more prepared intervention work items in a
 * single batch. Each work item carries the revision required for its
 * optimistic-concurrency `If-Match` header.
 *
 * @since 1.0.0
 */
export interface InterventionWorkItemDeleteCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Contains the work items currently loaded for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionWorkItemOutput[]}
   */
  readonly workItems: readonly InterventionWorkItemOutput[];
}

/**
 * Interface InterventionFacilityCreateCommand
 * @interface InterventionFacilityCreateCommand
 *
 * @description
 * Command used to create a facility attached to this intervention, through
 * `FacilityService.createForIntervention`.
 *
 * @since 1.0.0
 */
export interface InterventionFacilityCreateCommand {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Carries the values submitted to intervention facility create.
   *
   * @access public
   *
   * @type {CreateFacilityInput}
   */
  readonly input: CreateFacilityInput;
}
