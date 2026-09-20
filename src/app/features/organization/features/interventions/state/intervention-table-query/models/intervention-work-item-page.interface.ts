import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionWorkItemPage
 * @interface InterventionWorkItemPage
 *
 * @description
 * One evaluated page with its matching total and pagination, retained together during refreshes.
 *
 * @since 6.2.0
 */
export interface InterventionWorkItemPage {
  readonly items: readonly InterventionWorkItemOutput[];
  readonly total: number;
  readonly page: number;
  readonly itemsPerPage: number;
}
