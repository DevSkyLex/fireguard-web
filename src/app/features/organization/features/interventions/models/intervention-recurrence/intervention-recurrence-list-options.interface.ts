/**
 * Interface InterventionRecurrenceListOptions
 * @interface InterventionRecurrenceListOptions
 *
 * @description
 * Query options for `GET /intervention-recurrences`. There is no `template`
 * filter — the server does not support one.
 */
export interface InterventionRecurrenceListOptions {
  //#region Properties
  /** Active-state filter. Omitted lists both. */
  readonly isActive?: boolean;
  /** Page number. */
  readonly page?: number;
  /** Items per page — server default 30, clamped to 100. */
  readonly itemsPerPage?: number;
  //#endregion
}
