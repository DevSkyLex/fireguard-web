/**
 * What `InterventionAssignDialog` is currently asking to assign — the
 * intervention being reassigned and its current responsible, or `null` to
 * keep the dialog closed. Owned by the caller, the same shape
 * `InterventionConfirmRequest` uses for its own text confirmations.
 */
export type InterventionAssignRequest = {
  readonly interventionId: string;
  readonly interventionName: string;
  readonly currentResponsible: string | null;
};
