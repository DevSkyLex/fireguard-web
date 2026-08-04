import type { PaginationOptions } from '@core/api/models';
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
   * Facility IRI the intervention is attached to.
   *
   * @type {string}
   */
  readonly site?: string;

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
