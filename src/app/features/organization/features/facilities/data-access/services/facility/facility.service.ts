import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import { HydraApiService, type RequestOptions } from '@core/services/hydra-api';
import type {
  FacilityOutput,
  FacilityTypeOutput,
  FacilityListOptions,
  FacilityChildrenOptions,
  FacilityDescendantsOptions,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
} from '@features/organization/features/facilities/models';

/**
 * Service FacilityService
 * @class FacilityService
 * @extends {HydraApiService}
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
export class FacilityService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   *
   * @description
   * The base API path for all facility-related endpoints.
   *
   * This constant is used to construct the full endpoint URLs for
   * all methods in this service, ensuring consistency and ease of maintenance.
   * If the API path changes, only this constant needs to be updated.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
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
    return this.getCollection<FacilityTypeOutput>('/api/facilities/types', options);
  }

  /**
   * Method listStatuses
   * @method listStatuses
   *
   * @description
   * Retrieves the list of possible facility statuses (active, archived, etc.)
   * as a labelled collection. This can be used to populate status filters in the UI.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional request parameters.
   *
   * @return {Observable<HydraCollection<OptionOutput>>} An observable emitting the facility statuses collection.
   */
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
   * Mirrors the backend contract for the hierarchical TreeTable:
   * - `rootsOnly: true` returns only root facilities (no parent),
   * - `includeArchived`, `status`, `search` and `order` are forwarded as
   *   query parameters,
   * - direct children are fetched separately via {@link listChildren}.
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {FacilityListOptions} [options] - Optional pagination, root scoping and filters.
   *
   * @return {Observable<HydraCollection<FacilityOutput>>} An observable emitting the facilities collection.
   */
  public list(
    organizationId: string,
    options?: FacilityListOptions,
  ): Observable<HydraCollection<FacilityOutput>> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.rootsOnly) params['rootsOnly'] = true;
    if (options?.includeArchived) params['includeArchived'] = true;
    if (options?.status) params['status'] = options.status;
    if (options?.search) params['search'] = options.search;
    if (options?.order) {
      for (const [field, direction] of Object.entries(options.order)) {
        params[`order[${field}]`] = direction;
      }
    }

    return this.getCollection<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities`,
      {
        page: options?.page,
        itemsPerPage: options?.itemsPerPage,
        params,
      },
    );
  }

  /**
   * Method listChildren
   * @method listChildren
   *
   * @description
   * Retrieves the direct children of a facility via the dedicated
   * `/children` endpoint. This is the primary endpoint for lazy TreeTable
   * expansion — it returns only the immediate children of the given
   * facility, never the full subtree (use the backend `/descendants`
   * endpoint for bulk operations instead).
   *
   * @access public
   * @since 2.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the parent facility.
   * @param {FacilityChildrenOptions} [options] - Optional pagination.
   *
   * @return {Observable<HydraCollection<FacilityOutput>>} An observable emitting the direct children collection.
   */
  public listChildren(
    organizationId: string,
    facilityId: string,
    options?: FacilityChildrenOptions,
  ): Observable<HydraCollection<FacilityOutput>> {
    return this.getCollection<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/children`,
      {
        page: options?.page,
        itemsPerPage: options?.itemsPerPage,
      },
    );
  }

  /**
   * Method listDescendants
   * @method listDescendants
   *
   * @description
   * Retrieves all descendants of a facility through the dedicated
   * `/descendants` endpoint. The API returns a flat Hydra collection; callers
   * can rebuild the hierarchy by grouping facilities by `parentFacilityId`.
   *
   * @access public
   * @since 3.2.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the root facility.
   * @param {FacilityDescendantsOptions} [options] - Optional descendants filters.
   *
   * @return {Observable<HydraCollection<FacilityOutput>>} An observable emitting the descendant collection.
   */
  public listDescendants(
    organizationId: string,
    facilityId: string,
    options?: FacilityDescendantsOptions,
  ): Observable<HydraCollection<FacilityOutput>> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.includeArchived) params['includeArchived'] = true;
    if (options?.search) params['search'] = options.search;

    return this.getCollection<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/descendants`,
      { params },
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
  public get(organizationId: string, facilityId: string): Observable<FacilityOutput> {
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
  public create(organizationId: string, input: CreateFacilityInput): Observable<FacilityOutput> {
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
  public archive(organizationId: string, facilityId: string): Observable<FacilityOutput> {
    return this.postAction<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/archive`,
    );
  }

  /**
   * Restores an archived facility.
   */
  public restore(organizationId: string, facilityId: string): Observable<FacilityOutput> {
    return this.patch<Record<string, never>, FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/restore`,
      {},
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
