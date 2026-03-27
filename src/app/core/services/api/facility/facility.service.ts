import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import type {
  FacilityOutput,
  FacilityTypeOutput,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
} from '@core/models/facility';

/**
 * Service FacilityService
 * @class FacilityService
 * @extends {BaseApiService}
 *
 * @description
 * API service for facility management operations.
 * Allows listing, creating, updating, archiving, and moving
 * organization facilities (site/building/floor/zone/area).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class FacilityService extends BaseApiService {
  //#region Constants
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Public Methods
  /**
   * Method listTypes
   * @method listTypes
   *
   * @description
   * Retrieves the list of available facility types
   * (site, building, floor, zone, area) as a labelled collection.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional request parameters.
   *
   * @return {Observable<HydraCollection<FacilityTypeOutput>>} An observable emitting the facility types collection.
   */
  public listTypes(options?: RequestOptions): Observable<HydraCollection<FacilityTypeOutput>> {
    return this.getCollection<FacilityTypeOutput>(
      '/api/facilities/types',
      options,
    );
  }

  public listStatuses(options?: RequestOptions): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>('/api/facilities/statuses', options);
  }

  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of facilities belonging
   * to the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<FacilityOutput>>} An observable emitting the facilities collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<FacilityOutput>> {
    return this.getCollection<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities`,
      options,
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single facility by its ID within the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility to retrieve.
   *
   * @return {Observable<FacilityOutput>} An observable emitting the facility details.
   */
  public get(
    organizationId: string,
    facilityId: string,
  ): Observable<FacilityOutput> {
    return this.getOne<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}`,
    );
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new facility within the given organization.
   * Supports nested hierarchy by optionally specifying a parent facility.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {CreateFacilityInput} input - The data required to create the facility.
   *
   * @return {Observable<FacilityOutput>} An observable emitting the created facility details.
   */
  public create(
    organizationId: string,
    input: CreateFacilityInput,
  ): Observable<FacilityOutput> {
    return this.post<CreateFacilityInput, FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities`,
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Updates an existing facility using a partial merge-patch.
   * Only the fields included in the input will be modified.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility to update.
   * @param {UpdateFacilityInput} input - The partial data to apply to the facility.
   *
   * @return {Observable<FacilityOutput>} An observable emitting the updated facility details.
   */
  public update(
    organizationId: string,
    facilityId: string,
    input: UpdateFacilityInput,
  ): Observable<FacilityOutput> {
    return this.patch<UpdateFacilityInput, FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}`,
      input,
    );
  }

  /**
   * Method archive
   * @method archive
   *
   * @description
   * Marks a facility as archived, removing it from active lists
   * without permanently deleting it.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility to archive.
   *
   * @return {Observable<FacilityOutput>} An observable emitting the archived facility details.
   */
  public archive(
    organizationId: string,
    facilityId: string,
  ): Observable<FacilityOutput> {
    return this.postAction<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/archive`,
    );
  }

  /**
   * Method move
   * @method move
   *
   * @description
   * Moves a facility to a different parent within the organization hierarchy.
   * Pass `null` as `parentFacilityId` to place it at the root level.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility to move.
   * @param {MoveFacilityInput} input - Input containing the new parent facility ID.
   *
   * @return {Observable<FacilityOutput>} An observable emitting the moved facility details.
   */
  public move(
    organizationId: string,
    facilityId: string,
    input: MoveFacilityInput,
  ): Observable<FacilityOutput> {
    return this.post<MoveFacilityInput, FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/move`,
      input,
    );
  }
  //#endregion
}
