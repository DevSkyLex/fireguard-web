import { Service } from '@angular/core';
import { catchError, EMPTY, expand, reduce, switchMap, type Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  FacilityOutput,
  FacilityExportOptions,
  FacilityListOptions,
  FacilityChildrenOptions,
  FacilityDescendantsOptions,
  FacilityPlanOverlayOutput,
  FacilityBuildingModelOutput,
  FacilityGeocodeOutput,
  FacilityAddressSuggestionsOutput,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
  DuplicateFacilityInput,
  SetPlanGeometryInput,
} from '@features/organization/features/facilities/models';

/**
 * Service FacilityService
 * @class FacilityService
 *
 * @description
 * API service for facility management operations.
 * Allows listing, creating, updating, archiving, and moving
 * organization facilities (site/building/floor/zone/area).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @extends {HydraApiService}
 */
@Service()
export class FacilityService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   *
   * @description
   * The base API path for all facility-related endpoints.
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
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of facilities belonging
   * to the given organization.
   *
   * @access public
   * @since 1.0.0
   *   Mirrors the backend contract for the hierarchical TreeTable:
   *
   *   - `rootsOnly: true` returns only root facilities (no parent),
   *   - `includeArchived`, `status`, `hasCoordinates` and `search` are forwarded as query parameters,
   *     and the typed `sort` option is serialized by `HydraApiService.buildParams` as
   *     `order[<field>]=<direction>`,
   *   - direct children are fetched separately via {@link listChildren}.
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {FacilityListOptions} [options] - Optional pagination, root scoping and filters.
   *
   * @returns {Observable<HydraCollection<FacilityOutput>>} An observable emitting the facilities
   *   collection.
   */
  public list(
    organizationId: string,
    options?: FacilityListOptions,
  ): Observable<HydraCollection<FacilityOutput>> {
    // Seeded from the passthrough bag first so the typed filters below win on
    // a key collision. The table emits search, column filters and sort through
    // `params`; rebuilding the bag from scratch dropped them before the wire.
    const params: NonNullable<RequestOptions['params']> = { ...options?.params };

    if (options?.rootsOnly) params['rootsOnly'] = true;
    if (options?.includeArchived) params['includeArchived'] = true;
    if (options?.status) params['status'] = options.status;
    if (options?.hasCoordinates !== undefined) params['hasCoordinates'] = options.hasCoordinates;
    if (options?.search) params['search'] = options.search;

    return this.getCollection<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities`,
      {
        page: options?.page,
        itemsPerPage: options?.itemsPerPage,
        sort: options?.sort,
        params,
      },
    );
  }

  /**
   * Method exportCsv
   * @method exportCsv
   *
   * @description
   * Reads the organization's facilities export as CSV
   * (`GET /api/organizations/{organizationId}/facilities/export`),
   * forwarding the narrowing the endpoint accepts (see
   * {@link FacilityExportOptions}). The collection is capped server-side at
   * 50,000 rows; past it the endpoint answers `422` with an RFC 7807
   * `detail` instead of the file. Calls `this.http` directly for a response
   * shape (`responseType: 'blob'`) the base class does not support.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {FacilityExportOptions} [options] - The narrowing to apply.
   *
   * @returns {Observable<Blob>} The export's CSV binary content.
   */
  public exportCsv(organizationId: string, options?: FacilityExportOptions): Observable<Blob> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.includeArchived) params['includeArchived'] = true;
    if (options?.type) params['type'] = options.type;
    if (options?.status) params['status'] = options.status;
    if (options?.parentFacilityId) params['parentFacilityId'] = options.parentFacilityId;
    if (options?.rootsOnly) params['rootsOnly'] = true;
    if (options?.code) params['code'] = options.code;
    if (options?.search) params['search'] = options.search;
    if (options?.hasCoordinates !== undefined) params['hasCoordinates'] = options.hasCoordinates;

    return this.http.get(
      this.buildUrl(`${FacilityService.BASE_PATH}/${organizationId}/facilities/export`),
      {
        params: this.buildParams({ params }),
        responseType: 'blob',
        withCredentials: true,
      },
    );
  }

  /**
   * Method geocode
   * @method geocode
   *
   * @description
   * Resolves a free-text address to coordinates
   * (`GET /api/organizations/{organizationId}/facilities/geocode?address=…`),
   * proxied server-side to the geocoding provider. A `404` means the
   * provider found no match for the address; `429` is the endpoint's own
   * per-user rate limit (30/min). The response is a single JSON-LD item
   * keyed on `displayName`, so it flows through `getOne` unchanged.
   *
   * @access public
   * @since 1.6.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} address - The free-text address to resolve.
   *
   * @returns {Observable<FacilityGeocodeOutput>} An observable emitting the match.
   */
  public geocode(organizationId: string, address: string): Observable<FacilityGeocodeOutput> {
    return this.getOne<FacilityGeocodeOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/geocode`,
      { params: { address } },
    );
  }

  /**
   * Method addressSuggestions
   * @method addressSuggestions
   *
   * @description
   * Searches the organization-scoped address suggestion endpoint. An empty collection means no
   * match; provider outages and authorization failures remain HTTP errors.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization whose facility is being configured.
   * @param {string} query - Address query of three to 250 characters.
   *
   * @returns {Observable<FacilityAddressSuggestionsOutput>} Up to five address suggestions.
   */
  public addressSuggestions(
    organizationId: string,
    query: string,
  ): Observable<FacilityAddressSuggestionsOutput> {
    return this.getOne<FacilityAddressSuggestionsOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/address-suggestions`,
      { params: { q: query } },
    );
  }

  /**
   * Method listAll
   * @method listAll
   *
   * @description
   * Lists every facility by consuming the server-paginated collection.
   *
   * @access public
   * @since 0.1.0
   *
   * @param {string} organizationId - Organization whose complete resource collection is requested.
   * @param {FacilityListOptions} options - Request filters and ordering applied while fetching all
   *   pages.
   *
   * @returns {Observable<readonly FacilityOutput[]>}
   */
  public listAll(
    organizationId: string,
    options?: FacilityListOptions,
  ): Observable<readonly FacilityOutput[]> {
    const pageSize = 100;
    return this.list(organizationId, { ...options, page: 1, itemsPerPage: pageSize }).pipe(
      expand((collection, pageIndex) =>
        (pageIndex + 1) * pageSize < collection.totalItems
          ? this.list(organizationId, {
              ...options,
              page: pageIndex + 2,
              itemsPerPage: pageSize,
            })
          : EMPTY,
      ),
      reduce(
        (items, collection) => [...items, ...collection.member],
        [] as readonly FacilityOutput[],
      ),
    );
  }

  /**
   * Method listByIntervention
   * @method listByIntervention
   *
   * @description
   * Retrieves the facilities linked to one intervention through the
   * **canonical** collection (`GET /api/facilities?intervention=…`). The
   * organization-scoped {@link list} endpoint has no `intervention` filter,
   * so this bypasses it and queries the bare resource directly, the same way
   * {@link getCanonical} already does.
   * `CanonicalFacilityProvider` defaults `recordStatus` to `'draft'` whenever
   * the `intervention` filter is present, so an intervention published after
   * `FacilityInterventionResourceAdapter::publishDrafts` flips its linked
   * facilities to `'published'` would otherwise read back empty. Pass the
   * caller's known `recordStatus` explicitly once the intervention itself is
   * published; the parameter is optional and omitted entirely rather than
   * sent as `undefined` so the provider's own `'draft'` default still applies
   * everywhere else.
   *
   * @access public
   * @since 4.5.0
   *
   * @param {string} interventionId - The intervention to scope the query to.
   * @param {FacilityListOptions & {
   *   readonly recordStatus?: NonNullable<FacilityOutput['recordStatus']>;
   * }} [options]
   *   - Optional pagination, search, filters and record status.
   *
   * @returns {Observable<HydraCollection<FacilityOutput>>} An observable emitting the linked
   *   facilities.
   */
  public listByIntervention(
    interventionId: string,
    options?: FacilityListOptions & {
      readonly recordStatus?: NonNullable<FacilityOutput['recordStatus']>;
    },
  ): Observable<HydraCollection<FacilityOutput>> {
    return this.getCollection<FacilityOutput>('/api/facilities', {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      sort: options?.sort,
      search: options?.search,
      params: {
        ...options?.params,
        intervention: `/api/interventions/${interventionId}`,
        ...(options?.status ? { status: options.status } : {}),
        ...(options?.recordStatus ? { recordStatus: options.recordStatus } : {}),
      },
    });
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
   * @returns {Observable<HydraCollection<FacilityOutput>>} An observable emitting the direct
   *   children collection.
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
   * @returns {Observable<HydraCollection<FacilityOutput>>} An observable emitting the descendant
   *   collection.
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
   * @returns {Observable<FacilityOutput>} An observable emitting the facility details.
   */
  public get(organizationId: string, facilityId: string): Observable<FacilityOutput> {
    return this.getOne<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}`,
    );
  }

  /**
   * Method getPlanOverlay
   * @method getPlanOverlay
   *
   * @description
   * Reads one floor plan's read-only overlay — its zone polygons and equipment pins (`GET
   * /api/organizations/{organizationId}/facilities/{facilityId}/plan-overlay`). Omitting
   * `attachmentId` resolves the facility's primary plan server-side. Calls `this.http` directly,
   * like `FacilityAttachmentService.download`: the response is a computed projection, not a stored
   * Hydra item, so it carries no `@id`/`@type` and cannot satisfy `getOne`'s `T extends HydraItem`
   * bound.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility owning the plan.
   * @param {string} [attachmentId] - The plan to read; defaults to the facility's primary plan.
   *
   * @returns {Observable<FacilityPlanOverlayOutput>} An observable emitting the overlay.
   */
  public getPlanOverlay(
    organizationId: string,
    facilityId: string,
    attachmentId?: string,
  ): Observable<FacilityPlanOverlayOutput> {
    return this.http
      .get<FacilityPlanOverlayOutput>(
        this.buildUrl(
          `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/plan-overlay`,
        ),
        {
          headers: this.buildHeaders(),
          params: this.buildParams(attachmentId ? { params: { attachmentId } } : undefined),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method getBuildingModel
   * @method getBuildingModel
   *
   * @description
   * Reads one building facility's 3D model — its floors, each with its plan, outline and rooms
   * (`GET /api/organizations/{organizationId}/facilities/{facilityId}/building-model`). Calls
   * `this.http` directly, like {@link getPlanOverlay}: the response is a computed projection, not a
   * stored Hydra item, so it carries no `@id`/`@type` and cannot satisfy `getOne`'s `T extends
   * HydraItem` bound. `floors` arrives in server render order — never re-sort it.
   *
   * @access public
   * @since 1.7.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the building facility.
   *
   * @returns {Observable<FacilityBuildingModelOutput>} An observable emitting the building model.
   */
  public getBuildingModel(
    organizationId: string,
    facilityId: string,
  ): Observable<FacilityBuildingModelOutput> {
    return this.http
      .get<FacilityBuildingModelOutput>(
        this.buildUrl(
          `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/building-model`,
        ),
        { headers: this.buildHeaders(), withCredentials: true },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method setPlanGeometry
   * @method setPlanGeometry
   *
   * @description
   * Draws or clears one facility's own outline on a parent floor plan
   * (`PUT /api/organizations/{organizationId}/facilities/{facilityId}/plan-geometry`).
   * Calls `this.http` directly, like {@link getPlanOverlay}: the endpoint
   * echoes no stored Hydra item, so it cannot satisfy `this.put`'s
   * `TOutput extends HydraItem` bound.
   *
   * @access public
   * @since 1.4.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility whose outline is set.
   * @param {SetPlanGeometryInput} input - The geometry to write, or nulls to clear it.
   *
   * @returns {Observable<void>} An observable completing once the write lands.
   */
  public setPlanGeometry(
    organizationId: string,
    facilityId: string,
    input: SetPlanGeometryInput,
  ): Observable<void> {
    return this.http
      .put<void>(
        this.buildUrl(
          `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/plan-geometry`,
        ),
        input,
        { headers: this.buildHeaders(), withCredentials: true },
      )
      .pipe(catchError(this.handleError));
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
   * @returns {Observable<FacilityOutput>} An observable emitting the created facility details.
   */
  public create(organizationId: string, input: CreateFacilityInput): Observable<FacilityOutput> {
    return this.post<CreateFacilityInput, FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities`,
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
   * @param {CreateFacilityInput} input - input value.
   *
   * @returns {Observable<FacilityOutput>} Result of the create for intervention operation.
   */
  public createForIntervention(
    organizationId: string,
    interventionId: string,
    input: CreateFacilityInput,
  ): Observable<FacilityOutput> {
    const payload: CreateFacilityInput = {
      ...input,
      organization: `/api/organizations/${organizationId}`,
      intervention: `/api/interventions/${interventionId}`,
    };
    if (input.clientId) {
      return this.put<CreateFacilityInput, FacilityOutput>(
        `/api/facilities/${input.clientId}`,
        payload,
        { headers: { 'If-None-Match': '*' } },
      );
    }

    return this.post<CreateFacilityInput, FacilityOutput>('/api/facilities', payload);
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
   * @returns {Observable<FacilityOutput>} An observable emitting the updated facility details.
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
   * @returns {Observable<FacilityOutput>} An observable emitting the archived facility details.
   */
  public archive(organizationId: string, facilityId: string): Observable<FacilityOutput> {
    return this.postAction<FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/archive`,
    );
  }

  /**
   * Method restore
   * @method restore
   *
   * @description
   * Restores an archived facility.
   *
   * @access public
   * @since 0.1.0
   *
   * @param {string} organizationId - Organization that owns the archived facility.
   * @param {string} facilityId - Archived facility to restore.
   *
   * @returns {Observable<FacilityOutput>}
   */
  public restore(organizationId: string, facilityId: string): Observable<FacilityOutput> {
    return this.patch<Record<string, never>, FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/restore`,
      {},
    );
  }

  /**
   * Method getCanonical
   * @method getCanonical
   *
   * @description
   * Retrieves the canonical facility representation (`GET /api/facilities/{id}`),
   * the only surface that reports `revision`. Used internally by {@link remove}
   * to resolve the current revision immediately before deleting, since the
   * organization-scoped {@link get} never carries it.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} facilityId - The ID of the facility.
   *
   * @returns {Observable<FacilityOutput>} An observable emitting the canonical facility.
   */
  private getCanonical(facilityId: string): Observable<FacilityOutput> {
    return this.getOne<FacilityOutput>(`/api/facilities/${facilityId}`);
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a facility through the canonical resource
   * (`DELETE /api/facilities/{id}`). Backend semantics depend on the
   * facility's record status: a **published** facility (the normal case for
   * organization-scoped facilities shown by this app) is archived — the same
   * outcome as {@link archive} — while a **draft** facility created by an
   * in-progress intervention is hard-deleted, refused with a 409 if it still
   * has child facilities. Resolves the current revision via {@link getCanonical}
   * first to satisfy the required `If-Match` precondition.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} facilityId - The ID of the facility to delete.
   *
   * @returns {Observable<void>} An observable completing once the facility is deleted.
   */
  public remove(facilityId: string): Observable<void> {
    return this.getCanonical(facilityId).pipe(
      switchMap((canonical) =>
        this.delete(`/api/facilities/${facilityId}`, {
          headers: { 'If-Match': `"revision-${canonical.revision}"` },
        }),
      ),
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
   * @returns {Observable<FacilityOutput>} An observable emitting the moved facility details.
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

  /**
   * Method duplicate
   * @method duplicate
   *
   * @description
   * Duplicates a facility and its active subtree within the organization.
   * Both the copy's name and parent default server-side when omitted.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} facilityId - The ID of the facility to duplicate.
   * @param {DuplicateFacilityInput} [input] - Optional name and target parent for the copy.
   *
   * @returns {Observable<FacilityOutput>} An observable emitting the duplicated root facility.
   */
  public duplicate(
    organizationId: string,
    facilityId: string,
    input?: DuplicateFacilityInput,
  ): Observable<FacilityOutput> {
    return this.post<DuplicateFacilityInput, FacilityOutput>(
      `${FacilityService.BASE_PATH}/${organizationId}/facilities/${facilityId}/duplicate`,
      input ?? {},
    );
  }
  //#endregion
}
