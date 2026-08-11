/**
 * Type OrganizationMemberStatusFilter
 * @type OrganizationMemberStatusFilter
 *
 * @description
 * Which memberships `GET /api/organizations/{id}/members` returns. Omitting
 * the parameter applies **no** filter, which is the same thing as `all` —
 * the roster shows deactivated members unless `active` is asked for. Any
 * value outside these three is refused with 422 rather than ignored.
 *
 * @since 1.0.0
 */
export type OrganizationMemberStatusFilter = 'active' | 'inactive' | 'all';

/**
 * Type OrganizationMemberSortField
 * @type OrganizationMemberSortField
 *
 * @description
 * The two columns the members endpoint can order by.
 *
 * `displayName` is a documented approximation: names live in the User module's
 * database, so the backend orders by `userId` instead. Offer it as "by member"
 * rather than promising alphabetical order.
 *
 * @since 1.0.0
 */
export type OrganizationMemberSortField = 'joinedAt' | 'displayName';

/**
 * Type OrganizationMemberSortDirection
 * @type OrganizationMemberSortDirection
 *
 * @description
 * Sort direction accepted by the members endpoint's `order[...]` parameter.
 *
 * @since 1.0.0
 */
export type OrganizationMemberSortDirection = 'asc' | 'desc';

/**
 * Interface OrganizationMemberListQuery
 * @interface OrganizationMemberListQuery
 *
 * @description
 * Filters and ordering for `GET /api/organizations/{organizationId}/members`.
 *
 * Every field is optional and omitted fields are simply not sent, which lets
 * the server apply its own defaults — `status=active` and
 * `order[joinedAt]=asc`. Sorting is serialized as the bracketed pair the API
 * expects (`order[joinedAt]=desc`), so a field without a direction is
 * meaningless: {@link sortBy} and {@link sortDirection} are sent together or
 * not at all.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationMemberListQuery {
  //#region Properties
  /** Free-text search, matched server-side against the member's user identifier. */
  readonly search?: string;
  /** @type {OrganizationMemberStatusFilter} */
  readonly status?: OrganizationMemberStatusFilter;
  /** Restricts the roster to holders of one role. */
  readonly roleId?: string;
  /** @type {OrganizationMemberSortField} */
  readonly sortBy?: OrganizationMemberSortField;
  /** @type {OrganizationMemberSortDirection} */
  readonly sortDirection?: OrganizationMemberSortDirection;
  //#endregion
}
