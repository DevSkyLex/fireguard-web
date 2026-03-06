import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  OrganizationOutput,
  CreateOrganizationInput,
  OrganizationInvitationOutput,
  OrganizationStatisticsOutput,
  OrganizationCountryOutput,
  OrganizationLegalTypeOutput,
  OrganizationPermissionOutput,
} from '@core/models/organization';

/**
 * Service OrganizationService
 * @class OrganizationService
 * @extends {BaseApiService}
 *
 * @description
 * API service for organization management operations.
 * Handles CRUD, invitations, statistics, countries,
 * legal types, and permissions.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class OrganizationService extends BaseApiService {
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
    return this.getCollection<OrganizationOutput>(
      OrganizationService.BASE_PATH,
      options,
    );
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
   * method inherited from BaseApiService.
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
   * Method getStatistics
   * @method getStatistics
   *
   * @description
   * Retrieves aggregate statistics for the given organization,
   * such as member count, role count, and facility count.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<OrganizationStatisticsOutput>} An observable emitting the organization statistics.
   */
  public getStatistics(organizationId: string): Observable<OrganizationStatisticsOutput> {
    return this.getOne<OrganizationStatisticsOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/statistics`,
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
  public listCountries(options?: RequestOptions): Observable<HydraCollection<OrganizationCountryOutput>> {
    return this.getCollection<OrganizationCountryOutput>(
      `${OrganizationService.BASE_PATH}/countries`,
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
  public listLegalTypes(countryCode?: string, options?: RequestOptions): Observable<HydraCollection<OrganizationLegalTypeOutput>> {
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
