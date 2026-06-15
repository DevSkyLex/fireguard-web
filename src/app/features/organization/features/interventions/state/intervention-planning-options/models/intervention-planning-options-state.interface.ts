import type { SelectOption } from '@features/organization/features/interventions/models';

/**
 * State consumed by intervention planning controls.
 */
export interface InterventionPlanningOptionsState {
  readonly sites: readonly SelectOption[];
  readonly targets: readonly SelectOption[];
  readonly members: readonly SelectOption[];
  readonly referencePacks: readonly SelectOption[];
  readonly loading: boolean;
}
