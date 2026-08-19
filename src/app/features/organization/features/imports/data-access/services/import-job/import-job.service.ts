import { Service } from '@angular/core';
import { EMPTY, of, timer, type Observable } from 'rxjs';
import { expand, switchMap, take, takeWhile } from 'rxjs/operators';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ImportJobKind,
  ImportJobListQuery,
  ImportJobOutput,
} from '@features/organization/features/imports/models';

/**
 * Constant IMPORTS_PATH
 * @description The canonical, non-organization-scoped import job collection.
 */
const IMPORTS_PATH: string = '/api/imports';

/**
 * Constant IMPORT_JOB_POLL_INTERVAL_MS
 * @description How often {@link ImportJobService.pollJob} re-reads a running job.
 */
const IMPORT_JOB_POLL_INTERVAL_MS: number = 2_500;

/**
 * Constant IMPORT_JOB_POLL_MAX_EMISSIONS
 *
 * @description
 * Upper bound on {@link ImportJobService.pollJob} emissions (including the
 * seed), matching `InterventionService.pollPublication`'s bounded-poll
 * shape: past this the stream completes with the last observed — possibly
 * still running — state, so a caller must check the final status rather
 * than assume completion means terminal.
 */
const IMPORT_JOB_POLL_MAX_EMISSIONS: number = 240;

/**
 * Function isImportJobRunning
 * @description Whether a job has not yet reached a terminal status.
 * @param {ImportJobOutput} job - The job to check.
 * @returns {boolean} `true` while `pending` or `processing`.
 */
function isImportJobRunning(job: ImportJobOutput): boolean {
  return job.status === 'pending' || job.status === 'processing';
}

/**
 * Service ImportJobService
 * @class ImportJobService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the Import module: submitting a CSV upload
 * (`POST /api/imports`, multipart), listing and reading one organization's
 * import jobs, and polling a job to a terminal status. The `202` create
 * response never carries the report fields — callers must read them from a
 * subsequent {@link get} or {@link pollJob} emission.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ImportJobService extends HydraApiService {
  //#region Public Methods
  /**
   * Method create
   * @method create
   *
   * @description
   * Submits a CSV file for import as a multipart request. The backend
   * responds `202` with a creation-time job carrying no report fields —
   * poll {@link pollJob} to observe progress. Rejects with a `422` for an
   * invalid file (extension, size, MIME) and a `400` for a missing part.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization's bare id.
   * @param {ImportJobKind} kind - Which resource collection the file targets.
   * @param {File} file - The CSV file to upload.
   * @param {boolean} [dryRun] - Validates and reports without writing any row.
   *
   * @return {Observable<ImportJobOutput>} The created job, without report fields.
   */
  public create(
    organizationId: string,
    kind: ImportJobKind,
    file: File,
    dryRun?: boolean,
  ): Observable<ImportJobOutput> {
    const body: FormData = new FormData();
    body.set('organization', `/api/organizations/${organizationId}`);
    body.set('kind', kind);
    body.set('file', file, file.name);
    if (dryRun) body.set('dryRun', String(dryRun));

    return this.http.post<ImportJobOutput>(this.buildUrl(IMPORTS_PATH), body, {
      withCredentials: true,
      headers: { Accept: 'application/ld+json' },
    });
  }

  /**
   * Method list
   * @method list
   *
   * @description
   * Lists one organization's import jobs (`GET /api/imports`), optionally
   * narrowed by kind. `organization` is a required query parameter on the
   * canonical, non-organization-scoped route.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to list jobs for.
   * @param {RequestOptions} [options] - Pagination options.
   * @param {ImportJobListQuery} [query] - Optional kind narrowing.
   *
   * @return {Observable<HydraCollection<ImportJobOutput>>} The jobs collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
    query?: ImportJobListQuery,
  ): Observable<HydraCollection<ImportJobOutput>> {
    return this.getCollection<ImportJobOutput>(IMPORTS_PATH, {
      ...options,
      params: {
        ...options?.params,
        organization: organizationId,
        ...(query?.kind ? { kind: query.kind } : {}),
      },
    });
  }

  /**
   * Method get
   * @method get
   *
   * @description Re-reads one import job's current state (`GET /api/imports/{id}`).
   * @access public
   * @since 1.0.0
   * @param {string} jobId - The job to read.
   * @return {Observable<ImportJobOutput>} The job's current state.
   */
  public get(jobId: string): Observable<ImportJobOutput> {
    return this.getOne<ImportJobOutput>(`${IMPORTS_PATH}/${jobId}`);
  }

  /**
   * Method pollJob
   * @method pollJob
   *
   * @description
   * Re-reads a job once per {@link IMPORT_JOB_POLL_INTERVAL_MS} until it
   * leaves `pending`/`processing`, emitting each observed state — the
   * worker flushes progress every 50 rows, so a caller renders live
   * `processedRows`/`totalRows` from these emissions. Bounded by
   * {@link IMPORT_JOB_POLL_MAX_EMISSIONS}, mirroring
   * `InterventionService.pollPublication`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ImportJobOutput} initial - The job as the create call, or a previous poll, returned it.
   *
   * @return {Observable<ImportJobOutput>} Every polled state, ending on the terminal one or at the bound.
   */
  public pollJob(initial: ImportJobOutput): Observable<ImportJobOutput> {
    return of(initial).pipe(
      expand((job) =>
        isImportJobRunning(job)
          ? timer(IMPORT_JOB_POLL_INTERVAL_MS).pipe(switchMap(() => this.get(job.id)))
          : EMPTY,
      ),
      takeWhile(isImportJobRunning, true),
      take(IMPORT_JOB_POLL_MAX_EMISSIONS),
    );
  }
  //#endregion
}
