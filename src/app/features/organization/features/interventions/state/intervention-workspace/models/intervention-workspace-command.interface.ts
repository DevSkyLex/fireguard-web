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
  readonly interventionId: string;
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
  readonly interventionId: string;
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
  readonly interventionId: string;
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
  readonly interventionId: string;
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
  readonly interventionId: string;
  readonly file: Blob;
  readonly fileName: string;
  readonly label?: string;
  readonly workItemId?: string;
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
  readonly interventionId: string;
  readonly workItems: readonly InterventionWorkItemOutput[];
}
