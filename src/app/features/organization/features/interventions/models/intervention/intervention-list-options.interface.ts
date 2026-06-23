import type { PaginationOptions } from '@core/api/models';
import type { InterventionStatus } from './intervention-status.type';

/**
 * Type InterventionListOptions
 *
 * @description
 * Query options supported by the intervention listing endpoint: pagination,
 * the status filter and column sort directions.
 */
export type InterventionListOptions = PaginationOptions & {
  /** @type {InterventionStatus} */
  readonly status?: InterventionStatus;

  /**
   * Column sort directions keyed by field name, forwarded as `order[field]`.
   *
   * @type {Readonly<Record<string, 'asc' | 'desc'>>}
   */
  readonly order?: Readonly<Record<string, 'asc' | 'desc'>>;
};
