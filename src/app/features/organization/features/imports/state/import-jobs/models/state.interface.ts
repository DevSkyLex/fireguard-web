import type { CallState } from '@core/request-state';
import type { ImportJobOutput } from '@features/organization/features/imports/models';

/**
 * Interface ImportJobsState
 * @interface ImportJobsState
 *
 * @description
 * Auxiliary state for {@link ImportJobsStore}. Entity state (`jobEntities`,
 * `jobEntityMap`, `jobIds`) is initialised by `withEntities` and lives
 * outside this interface.
 *
 * @since 1.0.0
 */
export interface ImportJobsState {
  /** @type {CallState<null>} */
  readonly listCallState: CallState<null>;

  /** @type {number} */
  readonly totalJobs: number;

  /**
   * The last submitted upload's lifecycle. Carries the created job so the
   * upload form can read what was just accepted; the row itself lives in
   * the entity collection and is kept current by {@link ImportJobsStore.poll}.
   *
   * @type {CallState<ImportJobOutput>}
   */
  readonly createCallState: CallState<ImportJobOutput>;
}
