import type { InterventionWorkItemStatus } from '../intervention-work-item/intervention-work-item-status.type';

/**
 * Interface InterventionWorkItemTableQuery
 * @interface InterventionWorkItemTableQuery
 * @description Controlled criteria for the Work table; Remaining uses scalar status requests.
 * @since 6.2.0
 */
export interface InterventionWorkItemTableQuery {
  readonly search: string;
  readonly statuses: readonly InterventionWorkItemStatus[] | null;
}
