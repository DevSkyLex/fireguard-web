import type { CallState } from '@core/request-state';
import type {
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';

/**
 * State consumed by intervention planning controls.
 */
export interface InterventionPlanningOptionsState {
  readonly sites: readonly SelectOption[];
  readonly targets: readonly SelectOption[];
  readonly equipmentTypes: readonly SelectOption[];
  readonly members: readonly MemberSelectOption[];

  /** Lifecycle of the planning-options load (pending / success / error). */
  readonly loadCallState: CallState;
}
