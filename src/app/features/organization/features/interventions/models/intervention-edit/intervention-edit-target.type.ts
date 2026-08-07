/**
 * The intervention properties that can be edited where they are displayed.
 *
 * `schedule` is one target rather than two because `plannedStartAt` and `dueAt`
 * are picked together in a single range control and sent in one patch.
 */
export type InterventionEditTarget =
  | 'description'
  | 'priority'
  | 'site'
  | 'responsible'
  | 'participants'
  | 'schedule'
  | 'labels';
