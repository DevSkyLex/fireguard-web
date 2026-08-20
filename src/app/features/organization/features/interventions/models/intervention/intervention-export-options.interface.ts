import type { InterventionListOptions } from './intervention-list-options.interface';

/**
 * Type InterventionExportOptions
 *
 * @description
 * The subset of {@link InterventionListOptions} the CSV export endpoint
 * (`GET /api/interventions/export`) accepts: free-text search, the
 * `status`/`type`/`priority`/`site`/`responsible` `equals`/`isAnyOf` fields,
 * the `due=overdue` preset and its `dueAtAfter`/`dueAtBefore` bounds. The
 * endpoint has no use for `member`, `participant`, `label`, `number` or
 * either `plannedStartAt*` bound — sending one answers 400 — so they are
 * absent from this type rather than merely unused by callers.
 *
 * @since 8.4.0
 */
export type InterventionExportOptions = Pick<
  InterventionListOptions,
  | 'name'
  | 'status'
  | 'type'
  | 'priority'
  | 'site'
  | 'responsible'
  | 'due'
  | 'dueAtAfter'
  | 'dueAtBefore'
>;
