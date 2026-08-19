import type { HydraItem } from '@core/api/models';
import type { ImportJobKind } from './import-job-kind.type';
import type { ImportJobStatus } from './import-job-status.type';
import type { ImportRowErrorOutput } from './import-row-error-output.interface';

/**
 * Interface ImportJobOutput
 * @interface ImportJobOutput
 *
 * @description
 * One import job, mirroring the backend
 * `Import\Presentation\Api\Dto\Output\ImportJobOutput` DTO byte for byte.
 * The creation-time `202` response never carries the report fields
 * (`totalRows`, counts, `errorReport`) — a caller must poll `GET
 * /api/imports/{id}` for them rather than reading them off the create
 * response. `errorReport` is always an array, never `null`. API Platform
 * omits an absent optional field entirely rather than serializing it as
 * `null`, so every optional property here is read as possibly `undefined`,
 * never `=== null`.
 *
 * @since 1.0.0
 */
export interface ImportJobOutput extends HydraItem {
  /** @type {string} */
  readonly id: string;

  /** IRI of the owning organization. @type {string} */
  readonly organization: string;

  /** @type {ImportJobKind} */
  readonly kind: ImportJobKind;

  /** @type {ImportJobStatus} */
  readonly status: ImportJobStatus;

  /** @type {string} */
  readonly originalFilename: string;

  /** @type {boolean} */
  readonly dryRun: boolean;

  /** Absent until the file has been counted. @type {number | undefined} */
  readonly totalRows?: number;

  /** @type {number} */
  readonly processedRows: number;

  /** @type {number} */
  readonly successfulRows: number;

  /** @type {number} */
  readonly failedRows: number;

  /** Failures-only on a real run; one entry per row on a dry run. @type {ReadonlyArray<ImportRowErrorOutput>} */
  readonly errorReport: ReadonlyArray<ImportRowErrorOutput>;

  /** Populated only on a whole-file failure — never for per-row problems. @type {string | undefined} */
  readonly jobError?: string;

  /** @type {string} */
  readonly createdAt: string;

  /** Absent while `pending`. @type {string | undefined} */
  readonly startedAt?: string;

  /** Absent until the job reaches a terminal status. @type {string | undefined} */
  readonly completedAt?: string;

  /** @type {string} */
  readonly updatedAt: string;
}
