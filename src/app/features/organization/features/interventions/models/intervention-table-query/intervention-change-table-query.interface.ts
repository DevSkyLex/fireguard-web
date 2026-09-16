import type { InterventionChangeStatus } from '../intervention-change/intervention-change-status.type';

/**
 * Interface InterventionChangeTableQuery
 * @interface InterventionChangeTableQuery
 * @description Controlled criteria for the Changes history table.
 * @since 6.2.0
 */
export interface InterventionChangeTableQuery {
  readonly search: string;
  readonly status: InterventionChangeStatus | null;
}
