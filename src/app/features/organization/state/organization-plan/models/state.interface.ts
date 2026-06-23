import type { CallState } from '@core/request-state';
import type { OrganizationOutput, PlanOutput } from '@features/organization/models';

/**
 * Interface OrganizationPlanState
 * @interface OrganizationPlanState
 *
 * @description
 * State for the organization plan workflow: the selectable-plans listing and a
 * call state for the self-service plan change.
 */
export interface OrganizationPlanState {
  readonly plansCallState: CallState<ReadonlyArray<PlanOutput>>;
  readonly changePlanCallState: CallState<OrganizationOutput>;
}

/**
 * Interface OrganizationPlanChangeParams
 * @interface OrganizationPlanChangeParams
 *
 * @description
 * Parameters of the change-plan action.
 */
export interface OrganizationPlanChangeParams {
  readonly organizationId: string;
  readonly planId: string;
}
