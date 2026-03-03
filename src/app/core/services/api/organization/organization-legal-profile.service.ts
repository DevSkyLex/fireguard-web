import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type {
  OrganizationLegalProfileOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';

/**
 * Service OrganizationLegalProfileService
 * @class OrganizationLegalProfileService
 * @extends {BaseApiService}
 *
 * @description
 * API service for organization legal profile management.
 * Handles retrieving and upserting the legal information
 * (legal type, name, registration number, VAT, address)
 * associated with an organization.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class OrganizationLegalProfileService extends BaseApiService {
  //#region Public Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves the legal profile of the given organization.
   * Returns a 404 if no legal profile has been created yet.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<OrganizationLegalProfileOutput>} An observable emitting the legal profile details.
   */
  public get(organizationId: string): Observable<OrganizationLegalProfileOutput> {
    return this.getOne<OrganizationLegalProfileOutput>(
      `/api/organizations/${organizationId}/legal-profile`,
    );
  }

  /**
   * Method upsert
   * @method upsert
   *
   * @description
   * Creates or replaces the legal profile of the given organization.
   * Uses HTTP PUT semantics: the entire resource is replaced with the provided data.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {UpsertOrganizationLegalProfileInput} input - The full legal profile data to persist.
   *
   * @return {Observable<OrganizationLegalProfileOutput>} An observable emitting the upserted legal profile.
   */
  public upsert(
    organizationId: string,
    input: UpsertOrganizationLegalProfileInput,
  ): Observable<OrganizationLegalProfileOutput> {
    return this.put<UpsertOrganizationLegalProfileInput, OrganizationLegalProfileOutput>(
      `/api/organizations/${organizationId}/legal-profile`,
      input,
    );
  }
  //#endregion
}
