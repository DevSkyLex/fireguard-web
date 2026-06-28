/**
 * Interface InterventionBoardLoadRequest
 *
 * @description
 * Input used to load the pipeline board for an organization.
 *
 * @since 1.0.0
 */
export interface InterventionBoardLoadRequest {
  /** Active organization identifier, or null when none is selected. */
  readonly organizationId: string | null;
}
