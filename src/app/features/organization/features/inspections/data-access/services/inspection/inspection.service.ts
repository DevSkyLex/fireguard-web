import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import { HydraApiService, type RequestOptions } from '@core/services/hydra-api';
import type {
  InspectionOutput,
  CreateInspectionInput,
  UpdateInspectionInput,
  NonConformityOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
  InspectionListOptions,
  NonConformityListOptions,
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
@Injectable({ providedIn: 'root' })
export class InspectionService extends HydraApiService {
  //#region Constants
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

  public listStatuses(options?: RequestOptions): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>('/api/inspections/statuses', options);
  }

  public listResults(options?: RequestOptions): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>('/api/inspections/results', options);
  }

  public listInspectorTypes(options?: RequestOptions): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>('/api/inspections/inspector-types', options);
  }

  public listNonConformityStatuses(
    options?: RequestOptions,
  ): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>('/api/non-conformities/statuses', options);
  }

  //#region Public Methods — Inspections
  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of inspections belonging
   * to the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
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

    if (facilityId) {
      return this.listByFacility(organizationId, facilityId, {
        page: options?.page,
        itemsPerPage: options?.itemsPerPage,
        params,
      });
    }

    return this.getCollection<InspectionOutput>(this.inspectionPath(organizationId), {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      params,
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
   * Updates the resolution status of a non-conformity
   * (open → in_progress → done | waived).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} inspectionId - The ID of the inspection.
   * @param {string} nonConformityId - The ID of the non-conformity to update.
   * @param {UpdateNonConformityStatusInput} input - Input containing the new status value.
   *
   * @return {Observable<NonConformityOutput>} An observable emitting the updated non-conformity details.
   */
  public updateNonConformityStatus(
    organizationId: string,
    inspectionId: string,
    nonConformityId: string,
    input: UpdateNonConformityStatusInput,
  ): Observable<NonConformityOutput> {
    return this.patch<UpdateNonConformityStatusInput, NonConformityOutput>(
      `${this.inspectionPath(organizationId, inspectionId)}/non-conformities/${nonConformityId}/status`,
      input,
    );
  }
  //#endregion
}
