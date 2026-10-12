import type { ImportJobOutput } from './import-job-output.interface';

/**
 * Type ImportJobKind
 *
 * @description
 * Backend-owned identifier of the processor that handles an import job.
 * Derived from the job transport so FireGuard's upload choices remain known values without
 * closing the API contract to contributed or historical kinds.
 *
 * @since 1.0.0
 *
 * @type ImportJobKind
 */
export type ImportJobKind = ImportJobOutput['kind'];
