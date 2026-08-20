/**
 * Interventions model public exports.
 */
export type { InterventionExportOptions } from './intervention/intervention-export-options.interface';
export type { InterventionIssueOutput } from './intervention/intervention-issue-output.interface';
export type { InterventionIssueSeverity } from './intervention/intervention-issue-severity.type';
export type { InterventionListOptions } from './intervention/intervention-list-options.interface';
export type { InterventionStatisticsOutput } from './intervention-statistics/intervention-statistics-output.interface';
export type { InterventionSiteStatisticOutput } from './intervention-statistics/intervention-site-statistic-output.interface';
export type { InterventionResponsibleStatisticOutput } from './intervention-statistics/intervention-responsible-statistic-output.interface';
export type { InterventionCalendarFilters } from './intervention-view/intervention-calendar-filters.interface';
export type { InterventionDueRangeFilter } from './intervention-view/intervention-due-range-filter.type';
export type { InterventionFilterFieldOption } from './intervention-view/intervention-filter-field-option.interface';
export type { InterventionFilterFieldKey } from './intervention-view/intervention-filter-field.type';
export type {
  InterventionDueWindow,
  InterventionListFilters,
} from './intervention-view/intervention-list-filters.interface';
export type { InterventionPlannedStartRangeFilter } from './intervention-view/intervention-planned-start-range-filter.type';
export type {
  InterventionListSort,
  InterventionSortField,
} from './intervention-view/intervention-list-sort.interface';
export type { InterventionQueue } from './intervention-queue/intervention-queue.interface';
export type { InterventionQueueKey } from './intervention-queue/intervention-queue-key.type';
export type { InterventionUnsyncedEntry } from './intervention-queue/intervention-unsynced-entry.interface';
export type { InterventionAllowedActionsOutput } from './intervention/intervention-allowed-actions-output.interface';
export type { InterventionOutput } from './intervention/intervention-output.interface';
export type { InterventionDuplicatePrefill } from './intervention-duplicate/intervention-duplicate-prefill.interface';
export type { InterventionPriority } from './intervention/intervention-priority.type';
export type { InterventionStatus } from './intervention/intervention-status.type';
export type { InterventionTransitionCapability } from './intervention/intervention-transition-capability.type';
export type { InterventionTransitionSubject } from './intervention/intervention-transition-subject.interface';
export type { InterventionType } from './intervention/intervention-type.type';
export type { UpdateInterventionInput } from './intervention/update-intervention-input.interface';
export type { InterventionConfirmAcceptedEvent } from './intervention-confirm/intervention-confirm-accepted-event.type';
export type { InterventionConfirmRequest } from './intervention-confirm/intervention-confirm-request.type';
export type { InterventionAssignRequest } from './intervention-assign/intervention-assign-request.type';
export type { InterventionAssignSubmittedEvent } from './intervention-assign/intervention-assign-submitted-event.type';
export type { AssignInterventionTeamInput } from './intervention-team-assignment/assign-intervention-team-input.interface';
export type { InterventionEditState } from './intervention-edit/intervention-edit-state.interface';
export type { InterventionEditTarget } from './intervention-edit/intervention-edit-target.type';
export type { InterventionReadinessItem } from './intervention-edit/intervention-readiness-item.interface';
export type { InterventionReadinessTarget } from './intervention-edit/intervention-readiness-target.type';
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
export type { InterventionTemplateOutput } from './intervention-template/intervention-template-output.interface';
export type { InterventionTemplateInstantiationOutput } from './intervention-template/intervention-template-instantiation-output.interface';
export type { InstantiateInterventionTemplateInput } from './intervention-template/instantiate-intervention-template-input.interface';
export type { InterventionTemplateInstantiateRequest } from './intervention-template/intervention-template-instantiate-request.interface';
export type { InterventionRecurrenceFrequency } from './intervention-recurrence/intervention-recurrence-frequency.type';
export type { InterventionRecurrenceOutput } from './intervention-recurrence/intervention-recurrence-output.interface';
export type { CreateInterventionRecurrenceInput } from './intervention-recurrence/create-intervention-recurrence-input.interface';
export type { UpdateInterventionRecurrenceInput } from './intervention-recurrence/update-intervention-recurrence-input.interface';
export type { InterventionRecurrenceListOptions } from './intervention-recurrence/intervention-recurrence-list-options.interface';
export type { InterventionOutboxOperationFor } from './intervention-outbox/intervention-outbox-operation-for.interface';
export type { InterventionOutboxOperation } from './intervention-outbox/intervention-outbox-operation.type';
export type { InterventionOutboxPayloadMap } from './intervention-outbox/intervention-outbox-payload-map.interface';
export type { InterventionOutboxQueueEntry } from './intervention-outbox/intervention-outbox-queue-entry.type';
export type { InterventionOutboxType } from './intervention-outbox/intervention-outbox-type.type';
export type { InterventionAttachmentOutput } from './intervention-attachment/intervention-attachment-output.interface';
export type { InterventionAttachmentKind } from './intervention-attachment/intervention-attachment-kind.type';
export type { PublicationOutput } from './publication/publication-output.interface';
export type { PublicationStatus } from './publication/publication-status.type';
export type {
  InterventionCapabilities,
  InterventionCapabilityDeps,
  InterventionCommandAction,
  InterventionDiscoveryRequest,
  InterventionDiscoveryResult,
  InterventionIssueTarget,
  InterventionLinkedResourceTabId,
  InterventionPhase,
  InterventionPhotoAttachment,
  InterventionPlanningDetails,
  InterventionScanResult,
  InterventionTransitionRequest,
  InterventionWorkItemStatusChange,
  MemberSelectOption,
  SelectOption,
} from './intervention-workflow';
export type { MemberAvatar } from './member-avatar/member-avatar.interface';
export type { InterventionMentionSegment } from './intervention-mention/intervention-mention-segment.interface';
export type { InterventionMentionQuery } from './intervention-mention/intervention-mention-query.interface';

/**
 * The enum presentation registry (`ARCHITECTURE.md` §10.10, exception 1): the
 * descriptor maps and their resolver are runtime code, and they stay in
 * `models/` because the descriptor type is meaningless without them.
 */
export type { InterventionTagDescriptor } from './intervention-tag/intervention-tag-descriptor.interface';
export type { InterventionTagKind } from './intervention-tag/intervention-tag-kind.type';
export type { InterventionTagSeverity } from './intervention-tag/intervention-tag-severity.type';
export { resolveInterventionTag } from './intervention-tag/intervention-tag.util';
