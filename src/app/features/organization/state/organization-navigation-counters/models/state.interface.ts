/**
 * Interface OrganizationNavigationCountersState
 * @interface OrganizationNavigationCountersState
 *
 * @description
 * State interface for the organization navigation counters store, tracked
 * alongside `withQueryState`'s own private query state.
 */
export interface OrganizationNavigationCountersState {
  /** Identifier of the organization the current query result belongs to. */
  readonly currentOrganizationId: string | null;
}
