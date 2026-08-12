/**
 * What `InterventionAssignDialog` emits once a member is picked and
 * confirmed — the intervention being reassigned and the member now
 * responsible for it.
 */
export type InterventionAssignSubmittedEvent = {
  readonly interventionId: string;
  readonly responsible: string;
};
