import type { InterventionWorkItemStatus } from '../intervention-work-item/intervention-work-item-status.type';

/**
 * Interface InterventionWorkItemTableQuery
 * @interface InterventionWorkItemTableQuery
 *
 * @description Controlled server-side search, status, ordering and pagination for the Work table.
 *
 * @since 6.2.0
 */
export interface InterventionWorkItemTableQuery {
  readonly search: string;
  readonly statuses: readonly InterventionWorkItemStatus[] | null;
  readonly page?: number;
  readonly itemsPerPage?: number;
  readonly prioritizeAssignee?: string | null;
}
