import type { OrganizationOutput } from '@core/models/organization';
import type { Operation } from '@core/stores/operations';

/**
 * Interface OrganizationState
 * @interface OrganizationState
 *
 * @description
 * Component-scoped state for the organization list store. Defines only the
 * state properties that extend {@link PaginatedListState} — the create
 * operation tracking.
 *
 * The paginated list state (`items`, `total`, `isLoading`, `isDeleting`) is
 * provided separately by the `withPaginatedList` feature and is therefore not
 * repeated here.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationState {
  //#region Properties
  /**
   * Property createOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for the create organization operation.
   * Starts idle and transitions through loading → success | error when
   * {@link OrganizationStore#create} is called.
   *
   * @since 1.0.0
   *
   * @type {Operation<OrganizationOutput | null, unknown>}
   */
  readonly createOperation: Operation<OrganizationOutput | null, unknown>;
  //#endregion
}
