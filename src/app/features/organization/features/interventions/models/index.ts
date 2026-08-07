/**
 * Interventions model public exports.
 */
export type { InterventionIssueOutput } from './intervention/intervention-issue-output.interface';
export type { InterventionIssueSeverity } from './intervention/intervention-issue-severity.type';
export type { InterventionListOptions } from './intervention/intervention-list-options.interface';
export type { InterventionCalendarFilters } from './intervention-view/intervention-calendar-filters.interface';
export type {
  InterventionGrouping,
  InterventionRender,
  InterventionView,
} from './intervention-view/intervention-view.interface';
export type {
  InterventionDueWindow,
  InterventionListFilters,
} from './intervention-view/intervention-list-filters.interface';
export type {
  InterventionListSort,
  InterventionSortField,
} from './intervention-view/intervention-list-sort.interface';
export type { InterventionQueue } from './intervention-queue/intervention-queue.interface';
export type { InterventionQueueKey } from './intervention-queue/intervention-queue-key.type';
export type { InterventionUnsyncedEntry } from './intervention-queue/intervention-unsynced-entry.interface';
export type { InterventionOutput } from './intervention/intervention-output.interface';
export type { InterventionPriority } from './intervention/intervention-priority.type';
export type { InterventionStatus } from './intervention/intervention-status.type';
export type { InterventionType } from './intervention/intervention-type.type';
export type { CreateInterventionLabelInput } from './intervention-label/create-intervention-label-input.interface';
export type { InterventionLabelOutput } from './intervention-label/intervention-label-output.interface';
export type { InterventionLabelSummary } from './intervention-label/intervention-label-summary.interface';
export type { UpdateInterventionLabelInput } from './intervention-label/update-intervention-label-input.interface';
export type { InterventionActivityEvent } from './intervention-activity/intervention-activity-event.type';
export type { InterventionActivityKind } from './intervention-activity/intervention-activity-kind.type';
export type { InterventionActivityOutput } from './intervention-activity/intervention-activity-output.interface';
export type { InterventionStatusChangePayload } from './intervention-activity/intervention-status-change-payload.interface';
export type { CreateInterventionWorkItemInput } from './intervention-work-item/create-intervention-work-item-input.interface';
export type { InterventionWorkItemAction } from './intervention-work-item/intervention-work-item-action.type';
export type { InterventionWorkItemAssignee } from './intervention-work-item/intervention-work-item-assignee.interface';
export type { InterventionWorkItemOutput } from './intervention-work-item/intervention-work-item-output.interface';
export type { InterventionWorkItemSource } from './intervention-work-item/intervention-work-item-source.type';
export type { InterventionWorkItemTarget } from './intervention-work-item/intervention-work-item-target.interface';
export type { InterventionWorkItemStatus } from './intervention-work-item/intervention-work-item-status.type';
export type { UpdateInterventionWorkItemInput } from './intervention-work-item/update-intervention-work-item-input.interface';
export type { CreateInterventionChangeInput } from './intervention-change/create-intervention-change-input.interface';
export type { InterventionChangeOutput } from './intervention-change/intervention-change-output.interface';
export type { InterventionChangeStatus } from './intervention-change/intervention-change-status.type';
export type { UpdateInterventionChangeInput } from './intervention-change/update-intervention-change-input.interface';
export type { InterventionTypeOutput } from './intervention-type/intervention-type-output.interface';
export type { InterventionOutboxOperationFor } from './intervention-outbox/intervention-outbox-operation-for.interface';
export type { InterventionOutboxOperation } from './intervention-outbox/intervention-outbox-operation.type';
export type { InterventionOutboxPayloadMap } from './intervention-outbox/intervention-outbox-payload-map.interface';
export type { InterventionOutboxQueueEntry } from './intervention-outbox/intervention-outbox-queue-entry.type';
export type { InterventionOutboxType } from './intervention-outbox/intervention-outbox-type.type';
export type { PublicationOutput } from './publication/publication-output.interface';
export type { PublicationStatus } from './publication/publication-status.type';
export type {
  InterventionCommandAction,
  InterventionDiscoveryRequest,
  InterventionDiscoveryResult,
  InterventionPhase,
  InterventionPhotoAttachment,
  InterventionPlanningDetails,
  InterventionTransitionRequest,
  InterventionWorkItemStatusChange,
  MemberSelectOption,
  SelectOption,
} from './intervention-workflow';
export type { MemberAvatar } from './member-avatar/member-avatar.interface';

/**
 * The enum presentation registry (`ARCHITECTURE.md` §10.10, exception 1): the
 * descriptor maps and their resolver are runtime code, and they stay in
 * `models/` because the descriptor type is meaningless without them.
 */
export type { InterventionTagDescriptor } from './intervention-tag/intervention-tag-descriptor.interface';
export type { InterventionTagKind } from './intervention-tag/intervention-tag-kind.type';
export type { InterventionTagSeverity } from './intervention-tag/intervention-tag-severity.type';
export { resolveInterventionTag } from './intervention-tag/intervention-tag.util';
