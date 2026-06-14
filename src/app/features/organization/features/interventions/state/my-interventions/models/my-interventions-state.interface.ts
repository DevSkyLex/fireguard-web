import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * State of the field agent intervention list.
 */
export interface MyInterventionsState {
  readonly interventions: readonly InterventionOutput[];
  readonly loading: boolean;
}
