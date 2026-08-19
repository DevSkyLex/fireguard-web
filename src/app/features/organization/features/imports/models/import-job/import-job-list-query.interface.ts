import type { ImportJobKind } from './import-job-kind.type';

/**
 * Interface ImportJobListQuery
 * @interface ImportJobListQuery
 *
 * @description
 * Optional narrowing for `ImportJobService.list`, alongside the always
 * required organization id passed as its own method parameter.
 *
 * @since 1.0.0
 */
export interface ImportJobListQuery {
  /** Narrows the list to one job kind. @type {ImportJobKind | undefined} */
  readonly kind?: ImportJobKind;
}
