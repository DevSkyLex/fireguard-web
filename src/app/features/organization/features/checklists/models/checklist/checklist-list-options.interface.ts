import type { PaginationOptions } from '@core/models/api';
import type { ChecklistStatus } from './checklist-output.interface';

/**
 * Type ChecklistStatusFilter
 *
 * @description
 * Supported checklist status filter values.
 */
export type ChecklistStatusFilter = ChecklistStatus;

/**
 * Type ChecklistListOptions
 *
 * @description
 * Complete query options supported by the checklist
 * listing endpoint.
 */
export type ChecklistListOptions = PaginationOptions & {
  /** @type {ChecklistStatusFilter} */
  readonly status?: ChecklistStatusFilter;

  /**
   * Column sort directions keyed by field name, forwarded as `order[field]`.
   *
   * @type {Readonly<Record<string, 'asc' | 'desc'>>}
   */
  readonly order?: Readonly<Record<string, 'asc' | 'desc'>>;
};
