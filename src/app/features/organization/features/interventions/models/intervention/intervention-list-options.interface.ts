import type { PaginationOptions } from '@core/api/models';
import type { InterventionPriority } from './intervention-priority.type';
import type { InterventionStatus } from './intervention-status.type';
import type { InterventionType } from './intervention-type.type';

/**
 * Type InterventionListOptions
 *
 * @description
 * Query options supported by the intervention listing endpoint: pagination and
 * every filter the collection accepts.
 *
 * The type used to describe six of them while `InterventionService.list()`
 * carried the full set as an anonymous inline shape — so four filters the API
 * serves had no name anywhere a caller could reach. They are declared here now,
 * and the service takes this type.
 *
 * `status` is single-valued server side: a question spanning several statuses
 * is several requests, summed by the caller (see
 * `utils/intervention-queue-requests`).
 */
export type InterventionListOptions = PaginationOptions & {
  /**
   * Case-insensitive partial match against the intervention name.
   *
   * @type {string}
   */
  readonly name?: string;

  /** @type {InterventionStatus} */
  readonly status?: InterventionStatus;

  /** @type {InterventionType} */
  readonly type?: InterventionType;

  /**
   * Exact priority; the API answers 400 on an unknown value.
   *
   * @type {InterventionPriority}
   */
  readonly priority?: InterventionPriority;

  /**
   * Server-side due preset. `overdue` restricts to `dueAt` in the past AND a
   * non-terminal status (not published, not abandoned) — the exact set the
   * statistics endpoint counts as overdue, so the KPI tile and the list it
   * opens agree. Composable with `dueAtAfter`/`dueAtBefore`.
   *
   * @type {'overdue'}
   */
  readonly due?: 'overdue';

  /**
   * Inclusive lower bound (ISO 8601) applied to `dueAt`.
   *
   * @type {string}
   */
  readonly dueAtAfter?: string;

  /**
   * Inclusive upper bound (ISO 8601) applied to `dueAt`.
   *
   * @type {string}
   */
  readonly dueAtBefore?: string;

  /**
   * Member IRI of the responsible agent, e.g.
   * `/api/organizations/{organizationId}/members/{memberId}`.
   *
   * @type {string}
   */
  readonly responsible?: string;

  /**
   * Member IRI of any participant on the intervention.
   *
   * @type {string}
   */
  readonly participant?: string;

  /**
   * Member IRI matched as responsible OR participant — the "my interventions"
   * filter, resolved with a single request instead of two OR'd ones.
   *
   * @type {string}
   */
  readonly member?: string;

  /**
   * Facility IRI the intervention is attached to.
   *
   * @type {string}
   */
  readonly site?: string;

  /**
   * Intervention label IRI, e.g. `/api/intervention-labels/{id}`.
   *
   * @type {string}
   */
  readonly label?: string;

  /**
   * Exact per-organization intervention number; the API accepts an optional
   * case-insensitive `FG-` prefix and answers 400 on anything non-numeric.
   *
   * @type {number}
   */
  readonly number?: number;

  /**
   * Inclusive lower bound (ISO 8601) applied to `plannedStartAt`.
   *
   * @type {string}
   */
  readonly plannedStartAtAfter?: string;

  /**
   * Inclusive upper bound (ISO 8601) applied to `plannedStartAt`.
   *
   * @type {string}
   */
  readonly plannedStartAtBefore?: string;

  /**
   * Column sort directions keyed by field name, forwarded as `order[field]`.
   *
   * @type {Readonly<Record<string, 'asc' | 'desc'>>}
   */
  readonly order?: Readonly<Record<string, 'asc' | 'desc'>>;
};
