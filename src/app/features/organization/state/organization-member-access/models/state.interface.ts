import type { CallState } from '@core/state/request-state';
import type { CurrentOrganizationMemberProfileOutput } from '@features/organization/models';

/**
 * Interface OrganizationMemberAccessState
 * @interface OrganizationMemberAccessState
 *
 * @description
 * State interface for the current active organization member access store.
 */
export interface OrganizationMemberAccessState {
  /** Identifier of the organization currently associated with the access payload. */
  readonly currentOrganizationId: string | null;

  /** Current authenticated member access payload for the active organization. */
  readonly profile: CurrentOrganizationMemberProfileOutput | null;

  /** Async state for loading the current member access payload. */
  readonly accessCallState: CallState<CurrentOrganizationMemberProfileOutput>;
}
