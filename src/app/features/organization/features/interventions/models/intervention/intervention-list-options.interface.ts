import type { PaginationOptions } from '@core/api/models';
import type { InterventionStatus } from './intervention-status.type';
import type { InterventionType } from './intervention-type.type';

/**
 * Type InterventionListOptions
 *
 * @description
 * Query options supported by the intervention listing endpoint: pagination,
 * the status/type/due-date filters and column sort directions.
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
   * Responsible member IRI.
   *
   * The API has accepted this since the resource was written; the frontend
   * model simply never declared it, so no caller could pass it.
   *
   * @type {string}
   */
  readonly responsible?: string;

  /**
   * Participant member IRI.
   *
   * @type {string}
   */
  readonly participant?: string;

  /**
   * Site (facility) IRI.
   *
   * @type {string}
   */
  readonly site?: string;

  /**
   * Inclusive lower planned-start bound, ISO 8601.
   *
   * @type {string}
   */
  readonly plannedStartAtAfter?: string;

  /**
   * Inclusive upper planned-start bound, ISO 8601.
   *
   * @type {string}
   */
  readonly plannedStartAtBefore?: string;

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
   * Column sort directions keyed by field name, forwarded as `order[field]`.
   *
   * @type {Readonly<Record<string, 'asc' | 'desc'>>}
   */
  readonly order?: Readonly<Record<string, 'asc' | 'desc'>>;
};
