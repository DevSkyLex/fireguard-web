import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import { HydraApiService, type RequestOptions } from '@core/services/hydra-api';
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
  OrganizationInvitationOutput,
  OrganizationCountryOutput,
  OrganizationLegalTypeOutput,
  OrganizationLegalProfileOutput,
  OrganizationPermissionOutput,
  UpsertOrganizationLegalProfileInput,
} from '@features/organization/models';

/**
 * Service OrganizationService
 * @class OrganizationService
 * @extends {HydraApiService}
 *
 * @description
 * API service for organization management operations.
 * Handles CRUD, invitations, dashboard analytics, countries,
 * legal types, and permissions.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
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
   * Permanently deletes the organization identified by `id`.
   * Named `remove` to avoid shadowing the protected `delete`
   * method inherited from HydraApiService.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} id - The unique identifier of the organization to delete.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public remove(id: string): Observable<void> {
    return this.delete(`${OrganizationService.BASE_PATH}/${id}`);
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
   * Method listInvitations
   * @method listInvitations
   *
   * @description
   * Retrieves a paginated list of pending and past invitations
   * for the specified organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OrganizationInvitationOutput>>} An observable emitting the invitations collection.
   */
  public listInvitations(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationInvitationOutput>> {
    return this.getCollection<OrganizationInvitationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/invitations`,
      options,
    );
  }

  /**
   * Method revokeInvitation
   * @method revokeInvitation
   *
   * @description
   * Revokes a pending invitation, preventing the invitee from joining.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} invitationId - The ID of the invitation to revoke.
   *
   * @return {Observable<OrganizationInvitationOutput>} An observable emitting the revoked invitation.
   */
  public revokeInvitation(
    organizationId: string,
    invitationId: string,
  ): Observable<OrganizationInvitationOutput> {
    return this.postAction<OrganizationInvitationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/invitations/${invitationId}/revoke`,
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
   * Method getLegalProfile
   * @method getLegalProfile
   *
   * @description
   * Retrieves the legal profile associated with the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<OrganizationLegalProfileOutput>} An observable emitting the organization legal profile.
   */
  public getLegalProfile(organizationId: string): Observable<OrganizationLegalProfileOutput> {
    return this.getOne<OrganizationLegalProfileOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/legal-profile`,
    );
  }

  /**
   * Method upsertLegalProfile
   * @method upsertLegalProfile
   *
   * @description
   * Creates or updates the legal profile for the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {UpsertOrganizationLegalProfileInput} input - Legal profile payload to persist.
   *
   * @return {Observable<OrganizationLegalProfileOutput>} An observable emitting the saved legal profile.
   */
  public upsertLegalProfile(
    organizationId: string,
    input: UpsertOrganizationLegalProfileInput,
  ): Observable<OrganizationLegalProfileOutput> {
    return this.put<UpsertOrganizationLegalProfileInput, OrganizationLegalProfileOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/legal-profile`,
      input,
    );
  }

  /**
   * Method listCountries
   * @method listCountries
   *
   * @description
   * Retrieves the list of supported countries for organization registration.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OrganizationCountryOutput>>} An observable emitting the countries collection.
   */
  public listCountries(
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationCountryOutput>> {
    return this.getCollection<OrganizationCountryOutput>(
      `${OrganizationService.BASE_PATH}/countries`,
      options,
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
   * Method listLegalTypes
   * @method listLegalTypes
   *
   * @description
   * Retrieves the list of supported legal entity types,
   * optionally filtered by country code.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} [countryCode] - Optional ISO country code to filter legal types.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OrganizationLegalTypeOutput>>} An observable emitting the legal types collection.
   */
  public listLegalTypes(
    countryCode?: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationLegalTypeOutput>> {
    const mergedOptions: RequestOptions = {
      ...options,
      params: {
        ...options?.params,
        ...(countryCode ? { countryCode } : {}),
      },
    };
    return this.getCollection<OrganizationLegalTypeOutput>(
      `${OrganizationService.BASE_PATH}/legal-types`,
      mergedOptions,
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
  //#endregion
}
