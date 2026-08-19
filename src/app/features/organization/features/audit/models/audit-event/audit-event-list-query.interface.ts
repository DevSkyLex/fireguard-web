/**
 * Interface AuditEventListQuery
 * @interface AuditEventListQuery
 *
 * @description
 * Filters for `GET /api/organizations/{organizationId}/audit-events` —
 * the complete filter surface the backend exposes. There is no actor or
 * subject filter and no `order[]` param: ordering is fixed newest-first
 * (`occurredAt` DESC, `id` ASC tiebreak) and is never offered as a UI
 * choice.
 *
 * @since 1.0.0
 */
export interface AuditEventListQuery {
  /** Exact-match raw action id. @type {string | undefined} */
  readonly action?: string;

  /** Inclusive lower bound, ISO datetime. @type {string | undefined} */
  readonly from?: string;

  /** Inclusive upper bound, ISO datetime. @type {string | undefined} */
  readonly to?: string;
}
