import type { CallState } from '@core/request-state';
import type { TeamMemberOutput, TeamOutput } from '@features/organization/models';

/**
 * Interface OrganizationTeamsState
 * @interface OrganizationTeamsState
 *
 * @description
 * State owned by the organization teams workflow store. Teams and their
 * member rosters are held as `withEntities` collections (`team`,
 * `teamMember`); everything else — the currently selected team and the
 * per-operation call states — lives in plain state so the teams list, the
 * create/rename/delete actions and the member panel can each report their
 * own `idle → pending → success/error` lifecycle independently.
 *
 * @since 1.0.0
 */
export interface OrganizationTeamsState {
  /** Id of the team whose member panel is open, or `null` when none is selected. */
  readonly selectedTeamId: string | null;
  /** Request state for the teams list load. */
  readonly listCallState: CallState;
  /** Request state for team creation. */
  readonly createCallState: CallState<TeamOutput>;
  /** Request state for a team rename/description update. */
  readonly updateCallState: CallState<TeamOutput>;
  /** Request state for team deletion. */
  readonly removeCallState: CallState;
  /** Request state for the selected team's member roster load. */
  readonly membersCallState: CallState;
  /** Request state for adding a member to the selected team. */
  readonly addMemberCallState: CallState<TeamMemberOutput>;
  /** Request state for removing a member from the selected team. */
  readonly removeMemberCallState: CallState;
}
