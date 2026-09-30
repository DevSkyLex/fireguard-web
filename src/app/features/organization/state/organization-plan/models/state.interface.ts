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
  /**
   * Property plansCallState
   * @readonly
   *
   * @description
   * Holds the available plan catalog request and its result.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<ReadonlyArray<PlanOutput>>}
   */
  readonly plansCallState: CallState<ReadonlyArray<PlanOutput>>;

  /**
   * Property changePlanCallState
   * @readonly
   *
   * @description
   * Tracks the organization plan change separately from catalog loading.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<OrganizationOutput>}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization whose subscription is being changed.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property planId
   * @readonly
   *
   * @description
   * Identifies the catalog plan selected for the organization.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly planId: string;
}
