import type { SelectOption } from '@features/organization/features/missions/models';

/**
 * State consumed by mission planning controls.
 */
export interface MissionPlanningOptionsState {
  readonly sites: readonly SelectOption[];
  readonly targets: readonly SelectOption[];
  readonly members: readonly SelectOption[];
  readonly loading: boolean;
}
