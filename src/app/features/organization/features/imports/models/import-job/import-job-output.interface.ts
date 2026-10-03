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
  /**
   * Property reportPage
   * @readonly
   *
   * @description
   * One-based page of the ordered row report, available on detail reads.
   *
   * @access public
   *
   * @type {number | undefined}
   */
  readonly reportPage?: number;

  /**
   * Property reportItemsPerPage
   * @readonly
   *
   * @description
   * Report page size, bounded by the API to 100 rows.
   *
   * @access public
   *
   * @type {number | undefined}
   */
  readonly reportItemsPerPage?: number;

  /**
   * Property reportTotal
   * @readonly
   *
   * @description
   * Total row report entries before pagination.
   *
   * @access public
   *
   * @type {number | undefined}
   */
  readonly reportTotal?: number;

  /**
   * Property reportHasNextPage
   * @readonly
   *
   * @description
   * Whether the server has another report page.
   *
   * @access public
   *
   * @type {boolean | undefined}
   */
  readonly reportHasNextPage?: boolean;
  /**
   * Property id
   *
   * @description
   * Maintains the id view state.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organization
   *
   * @description
   * IRI of the owning organization.
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property kind
   *
   * @description
   * Maintains the kind view state.
   *
   * @type {ImportJobKind}
   */
  readonly kind: ImportJobKind;

  /**
   * Property status
   *
   * @description
   * Maintains the status view state.
   *
   * @type {ImportJobStatus}
   */
  readonly status: ImportJobStatus;

  /**
   * Property originalFilename
   *
   * @description
   * Maintains the originalFilename view state.
   *
   * @type {string}
   */
  readonly originalFilename: string;

  /**
   * Property dryRun
   *
   * @description
   * Maintains the dryRun view state.
   *
   * @type {boolean}
   */
  readonly dryRun: boolean;

  /**
   * Property totalRows
   *
   * @description
   * Absent until the file has been counted.
   *
   * @type {number | undefined}
   */
  readonly totalRows?: number;

  /**
   * Property processedRows
   *
   * @description
   * Maintains the processedRows view state.
   *
   * @type {number}
   */
  readonly processedRows: number;

  /**
   * Property successfulRows
   *
   * @description
   * Maintains the successfulRows view state.
   *
   * @type {number}
   */
  readonly successfulRows: number;

  /**
   * Property failedRows
   *
   * @description
   * Maintains the failedRows view state.
   *
   * @type {number}
   */
  readonly failedRows: number;

  /**
   * Property errorReport
   *
   * @description
   * Failures-only on a real run; one entry per row on a dry run.
   *
   * @type {ReadonlyArray<ImportRowErrorOutput>}
   */
  readonly errorReport: ReadonlyArray<ImportRowErrorOutput>;

  /**
   * Property jobError
   *
   * @description
   * Populated only on a whole-file failure — never for per-row problems.
   *
   * @type {string | undefined}
   */
  readonly jobError?: string;

  /**
   * Property createdAt
   *
   * @description
   * Maintains the createdAt view state.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property startedAt
   *
   * @description
   * Absent while `pending`.
   *
   * @type {string | undefined}
   */
  readonly startedAt?: string;

  /**
   * Property completedAt
   *
   * @description
   * Absent until the job reaches a terminal status.
   *
   * @type {string | undefined}
   */
  readonly completedAt?: string;

  /**
   * Property updatedAt
   *
   * @description
   * Maintains the updatedAt view state.
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property canResume
   *
   * @description
   * Server permission and lease check for resuming the same import.
   *
   * @type {boolean | undefined}
   */
  readonly canResume?: boolean;
  /**
   * Property canConfirm
   *
   * @description
   * Server-authorized successful simulation confirmation.
   */
  readonly canConfirm?: boolean;
  /**
   * Property confirmedJobId
   *
   * @description
   * The existing real import created by this simulation's confirmation.
   */
  readonly confirmedJobId?: string | null;
}
