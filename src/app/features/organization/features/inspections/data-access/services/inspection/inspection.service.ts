import type { HttpResponse } from '@angular/common/http';
import { Service } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { HydraApiService, type PaginationOptions, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  InspectionOutput,
  CreateInspectionInput,
  UpdateInspectionInput,
  NonConformityOutput,
  NonConformityWaivePendingOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
  UpdateNonConformityStatusResult,
  InspectionExportOptions,
  InspectionListOptions,
  NonConformityExportOptions,
  NonConformityListOptions,
  NonConformityStatisticsOptions,
  NonConformityStatisticsOutput,
} from '@features/organization/features/inspections/models';

/**
 * Service InspectionService
 * @class InspectionService
 * @extends {HydraApiService}
 *
 * @description
 * API service for inspection management operations.
 * Handles listing, creating, submitting, and closing inspections,
 * as well as managing non-conformities.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InspectionService extends HydraApiService {
  //#region Constants
  /**
   * Property BASE_PATH
   * @readonly
   *
   * @description
   * Provides the base path value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Private Helpers
  /**
   * Method inspectionPath
   * @method inspectionPath
   *
   * @description
   * Builds the base URL path for inspection endpoints.
   * When `inspectionId` is provided, appends it to the base path.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} [inspectionId] - Optional ID of a specific inspection.
   *
   * @return {string} The constructed URL path for the inspection resource.
   */
  private inspectionPath(organizationId: string, inspectionId?: string): string {
    const base: string = `${InspectionService.BASE_PATH}/${organizationId}/inspections`;
    return inspectionId ? `${base}/${inspectionId}` : base;
  }

  /**
   * Method facilityInspectionPath
   * @method facilityInspectionPath
   *
   * @description
   * Builds the base URL path for facility-scoped inspections endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility.
   *
   * @return {string} The constructed URL path for facility inspections.
   */
  private facilityInspectionPath(organizationId: string, facilityId: string): string {
    return `${InspectionService.BASE_PATH}/${organizationId}/facilities/${facilityId}/inspections`;
  }
  //#endregion

  //#region Public Methods — Inspections
  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of inspections belonging to the given
   * organization. `search` and `sort` are forwarded through `RequestOptions`'
   * typed fields, so `HydraApiService.buildParams` serializes them natively
   * (`search=` and `order[<field>]=<direction>`) rather than through the
   * hand-built `params` bag, which still carries the feature's own filters
   * (`equipmentId`, `result`, `status`).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {InspectionListOptions} [options] - Optional pagination, sort, search and filter parameters.
   *
   * @return {Observable<HydraCollection<InspectionOutput>>} An observable emitting the inspections collection.
   */
  public list(
    organizationId: string,
    options?: InspectionListOptions,
  ): Observable<HydraCollection<InspectionOutput>> {
    const params: NonNullable<RequestOptions['params']> = {
      ...options?.params,
    };
    const facilityId: string | undefined = options?.facilityId;

    if (options?.equipmentId) params['equipmentId'] = options.equipmentId;
    if (options?.result) params['result'] = options.result;
    if (options?.status) params['status'] = options.status;

    const requestOptions: RequestOptions = {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      search: options?.search,
      sort: options?.sort,
      params,
    };

    if (facilityId) {
      return this.listByFacility(organizationId, facilityId, requestOptions);
    }

    return this.getCollection<InspectionOutput>(
      this.inspectionPath(organizationId),
      requestOptions,
    );
  }

  /**
   * Method listByIntervention
   * @method listByIntervention
   *
   * @description
   * Retrieves the inspections linked to one intervention through the
   * **canonical** collection (`GET /api/inspections?intervention=…`). The
   * organization-scoped {@link list} endpoint has no `intervention` filter,
   * so this bypasses it and queries the bare resource directly.
   *
   * @access public
   * @since 4.5.0
   *
   * @param {string} interventionId - The intervention to scope the query to.
   * @param {PaginationOptions} [options] - Optional pagination.
   *
   * @return {Observable<HydraCollection<InspectionOutput>>} An observable emitting the linked inspections.
   */
  public listByIntervention(
    interventionId: string,
    options?: PaginationOptions,
  ): Observable<HydraCollection<InspectionOutput>> {
    return this.getCollection<InspectionOutput>('/api/inspections', {
      ...options,
      params: { intervention: `/api/interventions/${interventionId}` },
    });
  }

  /**
   * Method listByFacility
   * @method listByFacility
   *
   * @description
   * Retrieves a paginated list of inspections for a specific facility.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility.
   * @param {RequestOptions} [options] - Optional pagination and filter params.
   *
   * @return {Observable<HydraCollection<InspectionOutput>>} An observable emitting the inspections collection.
   */
  public listByFacility(
    organizationId: string,
    facilityId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<InspectionOutput>> {
    return this.getCollection<InspectionOutput>(
      this.facilityInspectionPath(organizationId, facilityId),
      options,
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single inspection by its ID within the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The ID of the inspection to retrieve.
   *
   * @return {Observable<InspectionOutput>} An observable emitting the inspection details.
   */
  public get(organizationId: string, inspectionId: string): Observable<InspectionOutput> {
    return this.getOne<InspectionOutput>(this.inspectionPath(organizationId, inspectionId));
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new inspection for the given organization,
   * associating it with a checklist and optional facility.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {CreateInspectionInput} input - The data required to create the inspection.
   *
   * @return {Observable<InspectionOutput>} An observable emitting the created inspection details.
   */
  public create(
    organizationId: string,
    input: CreateInspectionInput,
  ): Observable<InspectionOutput> {
    return this.post<CreateInspectionInput, InspectionOutput>(
      this.inspectionPath(organizationId),
      input,
    );
  }

  /**
   * Method createForIntervention
   * @method createForIntervention
   *
   * @description
   * Executes the create for intervention operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {string} interventionId - intervention Id value.
   * @param {CreateInspectionInput} input - input value.
   *
   * @return {Observable<InspectionOutput>} Result of the create for intervention operation.
   */
  public createForIntervention(
    organizationId: string,
    interventionId: string,
    input: CreateInspectionInput,
  ): Observable<InspectionOutput> {
    const payload: CreateInspectionInput = {
      ...input,
      organization: `/api/organizations/${organizationId}`,
      intervention: `/api/interventions/${interventionId}`,
    };
    if (input.clientId) {
      return this.put<CreateInspectionInput, InspectionOutput>(
        `/api/inspections/${input.clientId}`,
        payload,
        { headers: { 'If-None-Match': '*' } },
      );
    }

    return this.post<CreateInspectionInput, InspectionOutput>('/api/inspections', payload);
  }

  /**
   * Updates a draft inspection using JSON Merge Patch.
   */
  public update(
    organizationId: string,
    inspectionId: string,
    input: UpdateInspectionInput,
  ): Observable<InspectionOutput> {
    return this.patch<UpdateInspectionInput, InspectionOutput>(
      this.inspectionPath(organizationId, inspectionId),
      input,
    );
  }

  /**
   * Cancels an inspection.
   */
  public cancel(organizationId: string, inspectionId: string): Observable<void> {
    return this.delete(this.inspectionPath(organizationId, inspectionId));
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Submits an in-progress inspection, signalling that all
   * checklist items have been filled in and the inspection is ready for review.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The ID of the inspection to submit.
   *
   * @return {Observable<InspectionOutput>} An observable emitting the submitted inspection details.
   */
  public submit(organizationId: string, inspectionId: string): Observable<InspectionOutput> {
    return this.postAction<InspectionOutput>(
      `${this.inspectionPath(organizationId, inspectionId)}/submit`,
    );
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes a submitted inspection, finalising its result
   * and preventing further modifications.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The ID of the inspection to close.
   *
   * @return {Observable<InspectionOutput>} An observable emitting the closed inspection details.
   */
  public close(organizationId: string, inspectionId: string): Observable<InspectionOutput> {
    return this.postAction<InspectionOutput>(
      `${this.inspectionPath(organizationId, inspectionId)}/close`,
    );
  }

  /**
   * Method exportCsv
   * @method exportCsv
   *
   * @description
   * Reads the organization's inspections export as CSV
   * (`GET /api/organizations/{organizationId}/inspections/export`),
   * forwarding the narrowing the endpoint accepts (see
   * {@link InspectionExportOptions}) — free-text search is not part of it.
   * The collection is capped server-side at 50,000 rows; past it the
   * endpoint answers `422` with an RFC 7807 `detail` instead of the file.
   * Calls `this.http` directly for a response shape
   * (`responseType: 'blob'`) the base class does not support.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {InspectionExportOptions} [options] - The narrowing to apply.
   *
   * @return {Observable<Blob>} The export's CSV binary content.
   */
  public exportCsv(organizationId: string, options?: InspectionExportOptions): Observable<Blob> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.equipmentId) params['equipmentId'] = options.equipmentId;
    if (options?.facilityId) params['facilityId'] = options.facilityId;
    if (options?.result) params['result'] = options.result;
    if (options?.status) params['status'] = options.status;
    if (options?.performedAtFrom) params['performedAtFrom'] = options.performedAtFrom;
    if (options?.performedAtTo) params['performedAtTo'] = options.performedAtTo;
    if (options?.inspectorUserId) params['inspectorUserId'] = options.inspectorUserId;
    if (options?.checklistId) params['checklistId'] = options.checklistId;

    return this.http.get(this.buildUrl(`${this.inspectionPath(organizationId)}/export`), {
      params: this.buildParams({ params }),
      responseType: 'blob',
      withCredentials: true,
    });
  }
  //#endregion

  //#region Public Methods — Non-Conformities
  /**
   * Method listNonConformities
   * @method listNonConformities
   *
   * @description
   * Retrieves a paginated list of non-conformities recorded
   * during the given inspection.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The ID of the inspection.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<NonConformityOutput>>} An observable emitting the non-conformities collection.
   */
  public listNonConformities(
    organizationId: string,
    inspectionId: string,
    options?: NonConformityListOptions,
  ): Observable<HydraCollection<NonConformityOutput>> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.severity) params['severity'] = options.severity;
    if (options?.status) params['status'] = options.status;

    return this.getCollection<NonConformityOutput>(
      `${this.inspectionPath(organizationId, inspectionId)}/non-conformities`,
      {
        page: options?.page,
        itemsPerPage: options?.itemsPerPage,
        params,
      },
    );
  }

  /**
   * Method getNonConformityStatistics
   * @method getNonConformityStatistics
   *
   * @description
   * Reads the organization-wide non-conformity KPI snapshot
   * (`GET /organizations/{organizationId}/non-conformities/statistics`):
   * per-severity open/resolved counters, top facilities and equipment types
   * by open count, resolution timing and the SLA-breached open count. The
   * optional `from`/`to` bounds window on `createdAt`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The unique identifier of the organization.
   * @param {NonConformityStatisticsOptions} [options] - Optional inclusive ISO 8601 window bounds.
   *
   * @return {Observable<NonConformityStatisticsOutput>} An observable emitting the statistics snapshot.
   */
  public getNonConformityStatistics(
    organizationId: string,
    options?: NonConformityStatisticsOptions,
  ): Observable<NonConformityStatisticsOutput> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.from) params['from'] = options.from;
    if (options?.to) params['to'] = options.to;

    return this.getOne<NonConformityStatisticsOutput>(
      `${InspectionService.BASE_PATH}/${organizationId}/non-conformities/statistics`,
      { params },
    );
  }

  /**
   * Method exportNonConformitiesCsv
   * @method exportNonConformitiesCsv
   *
   * @description
   * Reads the organization-wide non-conformities export as CSV
   * (`GET /api/organizations/{organizationId}/non-conformities/export`),
   * forwarding the `severity`/`status` narrowing the endpoint accepts (see
   * {@link NonConformityExportOptions}). There is no per-inspection scoping
   * — the export always covers the whole organization. The collection is
   * capped server-side at 50,000 rows; past it the endpoint answers `422`
   * with an RFC 7807 `detail` instead of the file. Calls `this.http`
   * directly for a response shape (`responseType: 'blob'`) the base class
   * does not support.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {NonConformityExportOptions} [options] - The narrowing to apply.
   *
   * @return {Observable<Blob>} The export's CSV binary content.
   */
  public exportNonConformitiesCsv(
    organizationId: string,
    options?: NonConformityExportOptions,
  ): Observable<Blob> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.severity) params['severity'] = options.severity;
    if (options?.status) params['status'] = options.status;

    return this.http.get(
      this.buildUrl(`${InspectionService.BASE_PATH}/${organizationId}/non-conformities/export`),
      {
        params: this.buildParams({ params }),
        responseType: 'blob',
        withCredentials: true,
      },
    );
  }

  /**
   * Method exportReport
   * @method exportReport
   *
   * @description
   * Reads the inspection's PDF report
   * (`GET /api/organizations/{organizationId}/inspections/{inspectionId}/report`).
   * Requires `organization.inspection.read` on the organization AND a
   * pro/max plan — a non-entitled plan answers `403` with an RFC 7807
   * `detail` instead of the file. Calls `this.http` directly, like
   * {@link exportCsv}, for a response shape (`responseType: 'blob'`) the
   * base class does not support.
   *
   * @access public
   * @since 1.7.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The inspection to export the report for.
   *
   * @return {Observable<Blob>} The report's PDF binary content.
   */
  public exportReport(organizationId: string, inspectionId: string): Observable<Blob> {
    return this.http.get(
      this.buildUrl(this.inspectionPath(organizationId, inspectionId) + '/report'),
      {
        responseType: 'blob',
        withCredentials: true,
      },
    );
  }

  /**
   * Method exportNonConformitiesReport
   * @method exportNonConformitiesReport
   *
   * @description
   * Reads the organization-wide non-conformities report as PDF
   * (`GET /api/organizations/{organizationId}/non-conformities/report`),
   * forwarding the same `severity`/`status` narrowing as
   * {@link exportNonConformitiesCsv} (see {@link NonConformityExportOptions}).
   * There is no per-inspection scoping — the report always covers the whole
   * organization. Requires `organization.inspection.read` AND a pro/max plan
   * — a non-entitled plan answers `403` with an RFC 7807 `detail` — and the
   * same 50,000-row cap as the CSV export answers `422` past it. Calls
   * `this.http` directly for a response shape (`responseType: 'blob'`) the
   * base class does not support.
   *
   * @access public
   * @since 1.7.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {NonConformityExportOptions} [options] - The narrowing to apply.
   *
   * @return {Observable<Blob>} The report's PDF binary content.
   */
  public exportNonConformitiesReport(
    organizationId: string,
    options?: NonConformityExportOptions,
  ): Observable<Blob> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.severity) params['severity'] = options.severity;
    if (options?.status) params['status'] = options.status;

    return this.http.get(
      this.buildUrl(`${InspectionService.BASE_PATH}/${organizationId}/non-conformities/report`),
      {
        params: this.buildParams({ params }),
        responseType: 'blob',
        withCredentials: true,
      },
    );
  }

  /**
   * Retrieves a single non-conformity.
   */
  public getNonConformity(
    organizationId: string,
    inspectionId: string,
    nonConformityId: string,
  ): Observable<NonConformityOutput> {
    return this.getOne<NonConformityOutput>(
      `${this.inspectionPath(organizationId, inspectionId)}/non-conformities/${nonConformityId}`,
    );
  }

  /**
   * Method addNonConformity
   * @method addNonConformity
   *
   * @description
   * Records a new non-conformity on the given inspection,
   * capturing description, severity, and optional evidence.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The ID of the inspection.
   * @param {AddNonConformityInput} input - The data required to create the non-conformity.
   *
   * @return {Observable<NonConformityOutput>} An observable emitting the created non-conformity details.
   */
  public addNonConformity(
    organizationId: string,
    inspectionId: string,
    input: AddNonConformityInput,
  ): Observable<NonConformityOutput> {
    return this.post<AddNonConformityInput, NonConformityOutput>(
      `${this.inspectionPath(organizationId, inspectionId)}/non-conformities`,
      input,
    );
  }

  /**
   * Method updateNonConformityStatus
   * @method updateNonConformityStatus
   *
   * @description
   * Updates the resolution status of a non-conformity. Every transition
   * from `open`/`in_progress` is legal, including back to `open`; `done` and
   * `waived` are immutable server-side (a further status change on either
   * answers `409`). Waiving a non-conformity above the organization's
   * waiver-approval threshold does not resolve it synchronously: the backend
   * answers **202** with `NonConformityWaivePendingOutput` instead of the
   * usual **200** `NonConformityOutput`, and the record itself is left
   * unchanged pending a four-eyes decision. `patchWithStatus` (not `patch`)
   * is what exposes the distinction — the caller discriminates on
   * `result.kind` rather than losing it to a single unwrapped body.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The ID of the inspection.
   * @param {string} nonConformityId - The ID of the non-conformity to update.
   * @param {UpdateNonConformityStatusInput} input - Input containing the new status value.
   *
   * @return {Observable<UpdateNonConformityStatusResult>} The resolved status update, or the pending-approval outcome.
   */
  public updateNonConformityStatus(
    organizationId: string,
    inspectionId: string,
    nonConformityId: string,
    input: UpdateNonConformityStatusInput,
  ): Observable<UpdateNonConformityStatusResult> {
    return this.patchWithStatus<
      UpdateNonConformityStatusInput,
      NonConformityOutput | NonConformityWaivePendingOutput
    >(
      `${this.inspectionPath(organizationId, inspectionId)}/non-conformities/${nonConformityId}/status`,
      input,
    ).pipe(
      map(
        (
          response: HttpResponse<NonConformityOutput | NonConformityWaivePendingOutput>,
        ): UpdateNonConformityStatusResult =>
          response.status === 202
            ? {
                kind: 'pendingApproval',
                pending: response.body as NonConformityWaivePendingOutput,
              }
            : { kind: 'updated', nonConformity: response.body as NonConformityOutput },
      ),
    );
  }
  //#endregion
}
