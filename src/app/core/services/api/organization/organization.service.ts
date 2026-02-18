import { Injectable } from '@angular/core';
import { type Observable, catchError } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type {
  FacilityTypeOption,
  FacilityOutput,
  CreateFirstFacilityOnboardingInput,
  CreateOnboardingOrganizationInput,
  OrganizationLegalProfileOutput,
  OrganizationLegalTypeOption,
  OrganizationOnboardingStatusOutput,
  OrganizationOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';

/**
 * Service OrganizationService
 * @class OrganizationService
 * @extends {BaseApiService}
 *
 * @description
 * API service for organization onboarding flow.
 *
 * @version 1.0.0
 */
@Injectable({ providedIn: 'root' })
export class OrganizationService extends BaseApiService {
  //#region Constants
  /**
   * Constant BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for organization endpoints.
   *
   * @access private
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';

  /**
   * Constant FACILITY_BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for facility endpoints.
   *
   * @access private
   * @type {string}
   */
  private static readonly FACILITY_BASE_PATH: string = '/api/facilities';
  //#endregion

  //#region Public Methods
  /**
   * Method listOrganizationLegalTypes
   *
   * @description
   * Retrieves legal type options for organization forms.
   *
   * @access public
   *
   * @returns {Observable<readonly OrganizationLegalTypeOption[]>}
   */
  public listOrganizationLegalTypes(): Observable<
    readonly OrganizationLegalTypeOption[]
  > {
    return this.http
      .get<readonly OrganizationLegalTypeOption[]>(
        this.buildUrl(`${OrganizationService.BASE_PATH}/legal-types`),
        {
          headers: this.buildHeaders(),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method listFacilityTypes
   *
   * @description
   * Retrieves facility type options for facility forms.
   *
   * @access public
   *
   * @returns {Observable<readonly FacilityTypeOption[]>}
   */
  public listFacilityTypes(): Observable<readonly FacilityTypeOption[]> {
    return this.http
      .get<readonly FacilityTypeOption[]>(
        this.buildUrl(`${OrganizationService.FACILITY_BASE_PATH}/types`),
        {
          headers: this.buildHeaders(),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method getOnboardingStatus
   *
   * @description
   * Retrieves current onboarding status.
   *
   * @access public
   *
   * @returns {Observable<OrganizationOnboardingStatusOutput>}
   */
  public getOnboardingStatus(): Observable<OrganizationOnboardingStatusOutput> {
    return this.http
      .get<OrganizationOnboardingStatusOutput>(
        this.buildUrl(`${OrganizationService.BASE_PATH}/onboarding/status`),
        {
          headers: this.buildHeaders(),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method createOnboardingOrganization
   *
   * @description
   * Creates organization for onboarding step 1.
   *
   * @access public
   *
   * @param {CreateOnboardingOrganizationInput} input - Organization input payload.
   *
   * @returns {Observable<OrganizationOutput>}
   */
  public createOnboardingOrganization(
    input: CreateOnboardingOrganizationInput,
  ): Observable<OrganizationOutput> {
    return this.http
      .post<OrganizationOutput>(
        this.buildUrl(`${OrganizationService.BASE_PATH}/onboarding/organization`),
        input,
        {
          headers: this.buildHeaders(),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method upsertOrganizationLegalProfile
   *
   * @description
   * Creates or updates organization legal profile for onboarding step 2.
   *
   * @access public
   *
   * @param {string} organizationId - Organization id.
   * @param {UpsertOrganizationLegalProfileInput} input - Legal profile payload.
   *
   * @returns {Observable<OrganizationLegalProfileOutput>}
   */
  public upsertOrganizationLegalProfile(
    organizationId: string,
    input: UpsertOrganizationLegalProfileInput,
  ): Observable<OrganizationLegalProfileOutput> {
    return this.http
      .put<OrganizationLegalProfileOutput>(
        this.buildUrl(
          `${OrganizationService.BASE_PATH}/${organizationId}/legal-profile`,
        ),
        input,
        {
          headers: this.buildHeaders(),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Method createFirstFacilityOnboarding
   *
   * @description
   * Creates first facility for onboarding step 3.
   *
   * @access public
   *
   * @param {string} organizationId - Organization id.
   * @param {CreateFirstFacilityOnboardingInput} input - First facility input payload.
   *
   * @returns {Observable<FacilityOutput>}
   */
  public createFirstFacilityOnboarding(
    organizationId: string,
    input: CreateFirstFacilityOnboardingInput,
  ): Observable<FacilityOutput> {
    return this.http
      .post<FacilityOutput>(
        this.buildUrl(
          `${OrganizationService.BASE_PATH}/${organizationId}/onboarding/first-facility`,
        ),
        input,
        {
          headers: this.buildHeaders(),
          withCredentials: true,
        },
      )
      .pipe(catchError(this.handleError));
  }
  //#endregion
}
