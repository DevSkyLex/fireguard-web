import type { CallState } from '@core/state/request-state';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Interface OrganizationState
 * @interface OrganizationState
 *
 * @description
 * Component-scoped state for the organization list store. Entities are
 * managed by the `withEntities` feature (providing `organizationEntities`,
 * `organizationEntityMap`, `organizationIds`). This interface tracks
 * auxiliary state that does not belong to the entity collection itself:
 * CRUD operation tracking, list loading/deleting flags, and total count for
 * pagination.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationState {
  //#region Properties
  /**
   * Property createCallState
   * @readonly
   *
   * @description
   * Call state for the create organization operation. Starts idle and
   * transitions through pending → success | error when
   * {@link OrganizationStore#create} is called.
   *
   * @since 1.0.0
   *
   * @type {CallState<OrganizationOutput | null>}
   */
  readonly createCallState: CallState<OrganizationOutput | null>;

  /**
   * Property totalOrganizations
   * @readonly
   *
   * @description
   * Server-reported total count of organizations for the current query.
   * Used to drive pagination controls. Updated on every successful list
   * response and incremented/decremented on create/delete success.
   *
   * @since 2.0.0
   *
   * @type {number}
   */
  readonly totalOrganizations: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Call state for the organization list request. Transitions
   * idle → pending → success | error on every `load` / `loadOrganizations`
   * call.
   *
   * @since 2.0.0
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property deleteCallState
   * @readonly
   *
   * @description
   * Call state for delete operations (single or bulk). Starts idle and
   * transitions through pending → success | error when
   * {@link OrganizationStore#deleteOne} or {@link OrganizationStore#deleteMany}
   * is called. Error details are dispatched via store events.
   *
   * @since 3.0.0
   *
   * @type {CallState}
   */
  readonly deleteCallState: CallState;
  //#endregion
}
