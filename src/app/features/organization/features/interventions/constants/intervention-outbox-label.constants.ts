import type { InterventionOutboxType } from '@features/organization/features/interventions/models';

/**
 * Constant INTERVENTION_OUTBOX_LABEL
 *
 * @description
 * What each queued operation is called when the sync popover lists it. A field
 * agent who has checked twelve items and written three comments offline needs
 * to read what is waiting, not a count of seventeen.
 *
 * Verb-object in sentence case, the same grammar as the action that queued it,
 * so a line in the queue reads as the thing the agent did.
 *
 * @since 7.0.0
 *
 * @type {Readonly<Record<InterventionOutboxType, string>>}
 */
export const INTERVENTION_OUTBOX_LABEL: Readonly<Record<InterventionOutboxType, string>> = {
  'facility.create': $localize`:@@intervention.sync.op.facilityCreate:New facility`,
  'equipment.create': $localize`:@@intervention.sync.op.equipmentCreate:New equipment`,
  'inspection.create': $localize`:@@intervention.sync.op.inspectionCreate:New inspection`,
  'media.create': $localize`:@@intervention.sync.op.mediaCreate:New photo`,
  'attachment.upload': $localize`:@@intervention.sync.op.attachmentUpload:File upload`,
  'comment.create': $localize`:@@intervention.sync.op.commentCreate:New comment`,
  'intervention.update': $localize`:@@intervention.sync.op.interventionUpdate:Intervention edit`,
  'work-item.create': $localize`:@@intervention.sync.op.workItemCreate:New work item`,
  'work-item.update': $localize`:@@intervention.sync.op.workItemUpdate:Work item update`,
  'change.create': $localize`:@@intervention.sync.op.changeCreate:Proposed change`,
  'change.update': $localize`:@@intervention.sync.op.changeUpdate:Change decision`,
};
