import { Service } from '@angular/core';
import { EMPTY, expand, reduce, type Observable, catchError } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection, OptionOutput } from '@core/api/models';
import type {
  OrganizationDashboardOutput,
  OrganizationDashboardQueryOptions,
  OrganizationDashboardEquipmentTrendQueryOptions,
  OrganizationDashboardFacilityTrendQueryOptions,
  OrganizationDashboardInspectionTrendQueryOptions,
  OrganizationDashboardNonConformityTrendQueryOptions,
  OrganizationDashboardTrendQueryOptions,
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  ChangeOrganizationPlanInput,
  OrganizationQuotaOutput,
  OrganizationPermissionOutput,
  TransferOrganizationOwnershipInput,
} from '@features/organization/models';

/**
 * Service OrganizationService
 * @class OrganizationService
 * @extends {HydraApiService}
 *
 * @description
 * API service for organization management operations.
 * Handles CRUD, general & branding settings, logo upload,
 * dashboard analytics, and permissions. Invitation transport
 * lives in {@link OrganizationInvitationService}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class OrganizationService extends HydraApiService {
  //#region Constants
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base API path for all organization-related endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';

  /**
   * Method buildDashboardRequestOptions
   * @method buildDashboardRequestOptions
   *
   * @description
   * Normalizes optional dashboard query parameters into the
   * shared API request-options shape expected by HydraApiService.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {(OrganizationDashboardQueryOptions | OrganizationDashboardTrendQueryOptions | OrganizationDashboardInspectionTrendQueryOptions | OrganizationDashboardNonConformityTrendQueryOptions)} [options]
   * Optional dashboard filters.
   * @param {boolean} [includeGranularity=false] - Whether to serialize the trend-only granularity parameter.
   *
   * @return {RequestOptions | undefined} Normalized request options, or undefined when no filters are provided.
   */
  private buildDashboardRequestOptions(
    options?:
      | OrganizationDashboardQueryOptions
      | OrganizationDashboardTrendQueryOptions
      | OrganizationDashboardInspectionTrendQueryOptions
      | OrganizationDashboardNonConformityTrendQueryOptions,
    includeGranularity: boolean = false,
  ): RequestOptions | undefined {
    if (options === undefined) {
      return undefined;
    }

    const facilityType: string | undefined =
      'facilityType' in options ? options.facilityType : undefined;
    const equipmentType: string | undefined =
      'equipmentType' in options ? options.equipmentType : undefined;
    const equipmentStatus: string | undefined =
      'equipmentStatus' in options ? options.equipmentStatus : undefined;
    const inspectionStatus: string | undefined =
      'inspectionStatus' in options ? options.inspectionStatus : undefined;
    const inspectionResult: string | undefined =
      'inspectionResult' in options ? options.inspectionResult : undefined;
    const inspectorType: string | undefined =
      'inspectorType' in options ? options.inspectorType : undefined;
    const nonConformityStatus: string | undefined =
      'nonConformityStatus' in options ? options.nonConformityStatus : undefined;
    const nonConformitySeverity: string | undefined =
      'nonConformitySeverity' in options ? options.nonConformitySeverity : undefined;
    const granularity: string | undefined =
      includeGranularity && 'granularity' in options ? options.granularity : undefined;

    const params: NonNullable<RequestOptions['params']> = {
      ...(options.from ? { from: options.from } : {}),
      ...(options.to ? { to: options.to } : {}),
      ...(options.compare !== undefined ? { compare: options.compare } : {}),
      ...(options.timezone ? { timezone: options.timezone } : {}),
      ...(facilityType ? { facilityType } : {}),
      ...(equipmentType ? { equipmentType } : {}),
      ...(equipmentStatus ? { equipmentStatus } : {}),
      ...(inspectionStatus ? { inspectionStatus } : {}),
      ...(inspectionResult ? { inspectionResult } : {}),
      ...(inspectorType ? { inspectorType } : {}),
      ...(nonConformityStatus ? { nonConformityStatus } : {}),
      ...(nonConformitySeverity ? { nonConformitySeverity } : {}),
      ...(granularity ? { granularity } : {}),
    };

    return Object.keys(params).length > 0 ? { params } : undefined;
  }

  /**
   * Method dashboardPath
   * @method dashboardPath
   *
   * @description
   * Builds the canonical dashboard endpoint path for the organization,
   * optionally appending a dashboard sub-resource suffix.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} [suffix] - Optional dashboard sub-resource suffix.
   *
   * @return {string} The relative API path for the requested dashboard resource.
   */
  private dashboardPath(organizationId: string, suffix?: string): string {
    const basePath: string = `${OrganizationService.BASE_PATH}/${organizationId}/dashboard`;

    return suffix ? `${basePath}/${suffix}` : basePath;
  }
  //#endregion

  //#region Public Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of organizations the authenticated
   * user is a member of. Supports optional pagination and filtering.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional pagination and filter parameters.
   *
   * @return {Observable<HydraCollection<OrganizationOutput>>} An observable emitting the organizations collection.
   */
  public list(options?: RequestOptions): Observable<HydraCollection<OrganizationOutput>> {
    return this.getCollection<OrganizationOutput>(OrganizationService.BASE_PATH, options);
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves detailed information about a specific organization by its ID.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - The unique identifier of the organization.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the organization details.
   */
  public get(id: string): Observable<OrganizationOutput> {
    return this.getOne<OrganizationOutput>(`${OrganizationService.BASE_PATH}/${id}`);
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Archives the organization identified by `id` — a reversible soft delete,
   * not a permanent removal: the owned facilities, equipment, inspections and
   * interventions are preserved, and {@link restore} brings it all back.
   * Named `remove` to avoid shadowing the protected `delete` method inherited
   * from HydraApiService.
   *
   * `slug` is a mandatory danger-zone confirmation carried as a **query
   * parameter**, not a body: the caller retypes the organization's current
   * slug and a missing or mismatched value is refused with **422** without
   * archiving anything.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} id - The unique identifier of the organization to archive.
   * @param {string} slug - The organization's current slug, retyped as confirmation.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public remove(id: string, slug: string): Observable<void> {
    return this.delete(`${OrganizationService.BASE_PATH}/${id}`, { params: { slug } });
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new organization with the provided input data.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {CreateOrganizationInput} input - The data required to create the organization.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the created organization details.
   */
  public create(input: CreateOrganizationInput): Observable<OrganizationOutput> {
    return this.post<CreateOrganizationInput, OrganizationOutput>(
      OrganizationService.BASE_PATH,
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Partially updates the general & branding settings (name, slug,
   * description, active status) of the given organization.
   *
   * @access public
   * @since 1.3.0
   *
   * @param {string} id - The unique identifier of the organization.
   * @param {UpdateOrganizationInput} input - The settings fields to update.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the updated organization.
   */
  public update(id: string, input: UpdateOrganizationInput): Observable<OrganizationOutput> {
    return this.patch<UpdateOrganizationInput, OrganizationOutput>(
      `${OrganizationService.BASE_PATH}/${id}`,
      input,
    );
  }

  /**
   * Method changePlan
   * @method changePlan
   *
   * @description
   * Assigns a subscription plan to the organization (self-service). Requires the
   * `organization.settings.write` permission and returns the refreshed
   * organization with its updated plan and unlocked features.
   *
   * @access public
   * @since 1.4.0
   *
   * @param {string} organizationId - The unique identifier of the organization.
   * @param {ChangeOrganizationPlanInput} input - The target plan identifier.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the updated organization.
   */
  public changePlan(
    organizationId: string,
    input: ChangeOrganizationPlanInput,
  ): Observable<OrganizationOutput> {
    return this.patch<ChangeOrganizationPlanInput, OrganizationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/plan`,
      input,
    );
  }

  /**
   * Method getQuota
   * @method getQuota
   *
   * @description
   * Retrieves the current usage and plan limit of each capped resource
   * (members, facilities, equipment, inspections) for the organization.
   *
   * @access public
   * @since 1.4.0
   *
   * @param {string} organizationId - The unique identifier of the organization.
   *
   * @return {Observable<OrganizationQuotaOutput>} An observable emitting the quota usage.
   */
  public getQuota(organizationId: string): Observable<OrganizationQuotaOutput> {
    return this.getOne<OrganizationQuotaOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/quota`,
    );
  }

  /**
   * Method uploadLogo
   * @method uploadLogo
   *
   * @description
   * Uploads a new logo image for the organization via a multipart request
   * and returns the refreshed organization with the updated `logoUrl`.
   *
   * @access public
   * @since 1.3.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {Blob} logo - The logo image binary to upload.
   * @param {string} [fileName='logo'] - The file name sent with the upload.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the updated organization.
   */
  public uploadLogo(
    organizationId: string,
    logo: Blob,
    fileName: string = 'logo',
  ): Observable<OrganizationOutput> {
    const body: FormData = new FormData();
    body.set('logo', logo, fileName);

    return this.http
      .post<OrganizationOutput>(
        this.buildUrl(`${OrganizationService.BASE_PATH}/${organizationId}/logo`),
        body,
        {
          headers: this.defaultHeaders.delete('Content-Type'),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method removeLogo
   * @method removeLogo
   *
   * @description
   * Clears the organization's logo. The endpoint answers **204 with no body**
   * — unlike {@link uploadLogo}, it returns no refreshed organization — so the
   * caller owns clearing `logoUrl` in its own state. Idempotent when there is
   * no logo; **409** when the organization is archived.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public removeLogo(organizationId: string): Observable<void> {
    return this.delete(`${OrganizationService.BASE_PATH}/${organizationId}/logo`);
  }

  /**
   * Method transferOwnership
   * @method transferOwnership
   *
   * @description
   * Hands ownership to another active member and returns the refreshed
   * organization. Only the **current owner** may call this — it is deliberately
   * outside RBAC, so no permission substitutes for it — and `input.slug` must
   * retype the organization's current slug or the call is refused with **422**.
   * The new owner is granted the system `admin` role if they lack it.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {TransferOrganizationOwnershipInput} input - The new owner's user id and the slug confirmation.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the refreshed organization.
   */
  public transferOwnership(
    organizationId: string,
    input: TransferOrganizationOwnershipInput,
  ): Observable<OrganizationOutput> {
    return this.post<TransferOrganizationOwnershipInput, OrganizationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/transfer-ownership`,
      input,
    );
  }

  /**
   * Method suspend
   * @method suspend
   *
   * @description
   * Suspends the organization and returns it refreshed. A dedicated action
   * alongside — not replacing — the `isActive: false` toggle on {@link update},
   * and gated by the same `organization.settings.write` permission. Idempotent
   * when already suspended; **409** when the organization is archived.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the suspended organization.
   */
  public suspend(organizationId: string): Observable<OrganizationOutput> {
    return this.postAction<OrganizationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/suspend`,
    );
  }

  /**
   * Method restore
   * @method restore
   *
   * @description
   * Returns the organization to active from suspended **or archived**, which
   * makes it the undo for {@link remove}. Same permission and same
   * coexistence with the legacy toggle as {@link suspend}. Idempotent when
   * already active.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<OrganizationOutput>} An observable emitting the restored organization.
   */
  public restore(organizationId: string): Observable<OrganizationOutput> {
    return this.postAction<OrganizationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/restore`,
    );
  }

  /**
   * Method getDashboard
   * @method getDashboard
   *
   * @description
   * Retrieves dashboard analytics for the given organization from
   * the `/dashboard` endpoint. Supports the OpenAPI query parameters
   * used to scope the requested period.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {OrganizationDashboardQueryOptions} [options] - Optional aggregate dashboard query parameters.
   *
   * @return {Observable<OrganizationDashboardOutput>} An observable emitting the dashboard resource.
   */
  public getDashboard(
    organizationId: string,
    options?: OrganizationDashboardQueryOptions,
  ): Observable<OrganizationDashboardOutput> {
    return this.getOne<OrganizationDashboardOutput>(
      this.dashboardPath(organizationId),
      this.buildDashboardRequestOptions(options),
    );
  }

  /**
   * Method getDashboardInspectionsTrend
   * @method getDashboardInspectionsTrend
   *
   * @description
   * Retrieves the dedicated inspections chart resource from the
   * organization dashboard trends API.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {OrganizationDashboardInspectionTrendQueryOptions} [options] - Optional inspections trend query parameters.
   *
   * @return {Observable<OrganizationDashboardTrendOutput>} An observable emitting the inspections trend resource.
   */
  public getDashboardInspectionsTrend(
    organizationId: string,
    options?: OrganizationDashboardInspectionTrendQueryOptions,
  ): Observable<OrganizationDashboardTrendOutput> {
    return this.getOne<OrganizationDashboardTrendOutput>(
      this.dashboardPath(organizationId, 'trends/inspections'),
      this.buildDashboardRequestOptions(options, true),
    );
  }

  /**
   * Method getDashboardNonConformitiesOpenedTrend
   * @method getDashboardNonConformitiesOpenedTrend
   *
   * @description
   * Retrieves the dedicated non-conformities-opened chart resource
   * from the organization dashboard trends API.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {OrganizationDashboardNonConformityTrendQueryOptions} [options] - Optional opened non-conformities trend query parameters.
   *
   * @return {Observable<OrganizationDashboardTrendOutput>} An observable emitting the opened non-conformities trend resource.
   */
  public getDashboardNonConformitiesOpenedTrend(
    organizationId: string,
    options?: OrganizationDashboardNonConformityTrendQueryOptions,
  ): Observable<OrganizationDashboardTrendOutput> {
    return this.getOne<OrganizationDashboardTrendOutput>(
      this.dashboardPath(organizationId, 'trends/non-conformities-opened'),
      this.buildDashboardRequestOptions(options, true),
    );
  }

  /**
   * Method getDashboardNonConformitiesResolvedTrend
   * @method getDashboardNonConformitiesResolvedTrend
   *
   * @description
   * Retrieves the dedicated non-conformities-resolved chart resource
   * from the organization dashboard trends API.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {OrganizationDashboardNonConformityTrendQueryOptions} [options] - Optional resolved non-conformities trend query parameters.
   *
   * @return {Observable<OrganizationDashboardTrendOutput>} An observable emitting the resolved non-conformities trend resource.
   */
  public getDashboardNonConformitiesResolvedTrend(
    organizationId: string,
    options?: OrganizationDashboardNonConformityTrendQueryOptions,
  ): Observable<OrganizationDashboardTrendOutput> {
    return this.getOne<OrganizationDashboardTrendOutput>(
      this.dashboardPath(organizationId, 'trends/non-conformities-resolved'),
      this.buildDashboardRequestOptions(options, true),
    );
  }

  /**
   * Method getDashboardEquipmentCreatedTrend
   * @method getDashboardEquipmentCreatedTrend
   *
   * @description
   * Retrieves the dedicated equipment-created chart resource
   * from the organization dashboard trends API.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {OrganizationDashboardEquipmentTrendQueryOptions} [options] - Optional equipment trend query parameters.
   *
   * @return {Observable<OrganizationDashboardTrendOutput>} An observable emitting the equipment-created trend resource.
   */
  public getDashboardEquipmentCreatedTrend(
    organizationId: string,
    options?: OrganizationDashboardEquipmentTrendQueryOptions,
  ): Observable<OrganizationDashboardTrendOutput> {
    return this.getOne<OrganizationDashboardTrendOutput>(
      this.dashboardPath(organizationId, 'trends/equipment-created'),
      this.buildDashboardRequestOptions(options, true),
    );
  }

  /**
   * Method getDashboardFacilitiesCreatedTrend
   * @method getDashboardFacilitiesCreatedTrend
   *
   * @description
   * Retrieves the dedicated facilities-created chart resource
   * from the organization dashboard trends API.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {OrganizationDashboardFacilityTrendQueryOptions} [options] - Optional facility trend query parameters.
   *
   * @return {Observable<OrganizationDashboardTrendOutput>} An observable emitting the facilities-created trend resource.
   */
  public getDashboardFacilitiesCreatedTrend(
    organizationId: string,
    options?: OrganizationDashboardFacilityTrendQueryOptions,
  ): Observable<OrganizationDashboardTrendOutput> {
    return this.getOne<OrganizationDashboardTrendOutput>(
      this.dashboardPath(organizationId, 'trends/facilities-created'),
      this.buildDashboardRequestOptions(options, true),
    );
  }

  /**
   * Method listStatuses
   * @method listStatuses
   *
   * @description
   * Retrieves the list of available organization status options.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OptionOutput>>} An observable emitting the organization status options.
   */
  public listStatuses(options?: RequestOptions): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>(`${OrganizationService.BASE_PATH}/statuses`, options);
  }

  /**
   * Method listInvitationStatuses
   * @method listInvitationStatuses
   *
   * @description
   * Retrieves the list of available organization invitation status options.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OptionOutput>>} An observable emitting the invitation status options.
   */
  public listInvitationStatuses(
    options?: RequestOptions,
  ): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>(
      `${OrganizationService.BASE_PATH}/invitation-statuses`,
      options,
    );
  }

  /**
   * Method listPermissions
   * @method listPermissions
   *
   * @description
   * Retrieves the full list of available permissions for the given organization.
   * Used to populate permission selectors when creating or editing roles.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OrganizationPermissionOutput>>} An observable emitting the permissions collection.
   */
  public listPermissions(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationPermissionOutput>> {
    return this.getCollection<OrganizationPermissionOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/permissions`,
      options,
    );
  }

  /**
   * Method listAllPermissions
   * @method listAllPermissions
   *
   * @description
   * Lists the complete permission catalog by walking the server-paginated
   * `permissions` collection page by page — the catalog feeds the "Permissions
   * in catalog" KPI, the create-role dialog checkbox list, and the
   * role-permissions sheet, all of which need every entry, never one page.
   *
   * @access public
   * @since 1.6.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional extra request parameters.
   *
   * @return {Observable<readonly OrganizationPermissionOutput[]>} An observable emitting the complete permission catalog.
   */
  public listAllPermissions(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<readonly OrganizationPermissionOutput[]> {
    const pageSize = 100;
    return this.listPermissions(organizationId, {
      ...options,
      page: 1,
      itemsPerPage: pageSize,
    }).pipe(
      expand((collection, pageIndex) =>
        (pageIndex + 1) * pageSize < collection.totalItems
          ? this.listPermissions(organizationId, {
              ...options,
              page: pageIndex + 2,
              itemsPerPage: pageSize,
            })
          : EMPTY,
      ),
      reduce(
        (items, collection) => [...items, ...collection.member],
        [] as readonly OrganizationPermissionOutput[],
      ),
    );
  }
  //#endregion
}
