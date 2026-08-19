import type { ImportJobKind } from '@features/organization/features/imports/models';

/**
 * Interface ImportUploadSubmission
 * @interface ImportUploadSubmission
 *
 * @description
 * The validated upload the form emits — the page folds in the organization
 * id before calling `ImportJobsStore.create`.
 *
 * @since 1.0.0
 */
export interface ImportUploadSubmission {
  /** @type {ImportJobKind} */
  readonly kind: ImportJobKind;

  /** @type {File} */
  readonly file: File;

  /** @type {boolean} */
  readonly dryRun: boolean;
}
