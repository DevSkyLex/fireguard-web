import type { HttpErrorResponse } from '@angular/common/http';
import { isApiError } from '@core/api/utils';

/**
 * Function resolveCsvExportErrorDetail
 *
 * @description
 * Resolves the RFC 7807 `detail` a failed CSV export response carries —
 * typically the `422` row-cap refusal. Because the export is fetched with
 * `responseType: 'blob'`, a JSON error body arrives as a `Blob` too and
 * must be read back through `Blob.text()` before it can be parsed. Answers
 * `null` for a non-blob body, a non-JSON body, or a body that is not an
 * RFC 7807 problem document, so the caller can fall back to its own
 * generic message.
 *
 * @param {HttpErrorResponse} error - The failed export response.
 *
 * @returns {Promise<string | null>} The problem document's `detail`, or `null`.
 *
 * @since 1.0.0
 */
export async function resolveCsvExportErrorDetail(
  error: HttpErrorResponse,
): Promise<string | null> {
  if (!(error.error instanceof Blob)) return null;

  try {
    const body: unknown = JSON.parse(await error.error.text());
    return isApiError(body) ? body.detail : null;
  } catch {
    return null;
  }
}

/**
 * Function buildCsvExportFilename
 *
 * @description
 * The CSV export's download filename: the collection prefix, the
 * organization, stamped with today's date (`yyyyMMdd`).
 *
 * @param {string} prefix - The collection's kebab-case name (`equipments`, …).
 * @param {string} organizationId - The exporting organization.
 * @param {Date} [now] - The stamping instant, defaulting to now.
 *
 * @returns {string} The filename, `<prefix>-<organizationId>-<yyyyMMdd>.csv`.
 *
 * @since 1.0.0
 */
export function buildCsvExportFilename(
  prefix: string,
  organizationId: string,
  now: Date = new Date(),
): string {
  const yyyy: string = String(now.getFullYear());
  const mm: string = String(now.getMonth() + 1).padStart(2, '0');
  const dd: string = String(now.getDate()).padStart(2, '0');

  return `${prefix}-${organizationId}-${yyyy}${mm}${dd}.csv`;
}
