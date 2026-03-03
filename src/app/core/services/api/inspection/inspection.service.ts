import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  InspectionOutput,
  CreateInspectionInput,
  NonConformityOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
} from '@core/models/inspection';

/**
 * Service InspectionService
 * @class InspectionService
 * @extends {BaseApiService}
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
export class InspectionService extends BaseApiService {
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
  //#endregion

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
    options?: RequestOptions,
  ): Observable<HydraCollection<InspectionOutput>> {
    return this.getCollection<InspectionOutput>(
      this.inspectionPath(organizationId),
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
  public get(
    organizationId: string,
    inspectionId: string,
  ): Observable<InspectionOutput> {
    return this.getOne<InspectionOutput>(
      this.inspectionPath(organizationId, inspectionId),
    );
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
  public submit(
    organizationId: string,
    inspectionId: string,
  ): Observable<InspectionOutput> {
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
  public close(
    organizationId: string,
    inspectionId: string,
  ): Observable<InspectionOutput> {
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
    options?: RequestOptions,
  ): Observable<HydraCollection<NonConformityOutput>> {
    return this.getCollection<NonConformityOutput>(
      `${this.inspectionPath(organizationId, inspectionId)}/non-conformities`,
      options,
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
