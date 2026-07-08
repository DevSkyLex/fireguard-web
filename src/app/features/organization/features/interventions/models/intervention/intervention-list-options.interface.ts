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
   * Column sort directions keyed by field name, forwarded as `order[field]`.
   *
   * @type {Readonly<Record<string, 'asc' | 'desc'>>}
   */
  readonly order?: Readonly<Record<string, 'asc' | 'desc'>>;
};
