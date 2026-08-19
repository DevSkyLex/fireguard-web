import type { ImportRowErrorCode } from './import-row-error-code.type';

/**
 * Interface ImportRowErrorOutput
 * @interface ImportRowErrorOutput
 *
 * @description
 * One reported CSV row, mirroring the backend
 * `Import\Presentation\Api\Dto\Output\ImportRowErrorOutput` DTO byte for
 * byte. On a real run, `errorReport` carries failures only; on a dry run it
 * carries one entry **per row**, including every `would_create` row.
 *
 * @since 1.0.0
 */
export interface ImportRowErrorOutput {
  /** One-based row number in the uploaded file. @type {number} */
  readonly rowNumber: number;

  /** The offending column name, or `null` when the row itself is at fault. @type {string | null} */
  readonly column: string | null;

  /** @type {ImportRowErrorCode} */
  readonly code: ImportRowErrorCode;

  /** Human-readable detail for this row. @type {string} */
  readonly message: string;
}
