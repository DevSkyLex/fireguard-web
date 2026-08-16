import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
} from '@features/organization/models';

/**
 * Service ComplianceService
 * @class ComplianceService
 * @extends {HydraApiService}
 *
 * @description
 * API service for the backend Compliance module's read-only surface: the
 * enriched facility hierarchy, the organization/facility compliance
 * register summary, and the safety-register PDF export.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ComplianceService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   *
   * @description
   * The base API path for every Compliance-module endpoint.
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
   * Method getFacilityTree
   * @method getFacilityTree
   *
   * @description
   * Reads the enriched facility hierarchy
   * (`GET /organizations/{organizationId}/facility-tree`): nested Site ->
   * Building -> Floor -> Zone/Area nodes, each already carrying its
   * equipment count and compliance verdict/rate, eagerly to the leaves.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to read the tree for.
   *
   * @return {Observable<ComplianceFacilityTreeOutput>} The tree snapshot.
   */
  public getFacilityTree(organizationId: string): Observable<ComplianceFacilityTreeOutput> {
    return this.getOne<ComplianceFacilityTreeOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/facility-tree`,
    );
  }

  /**
   * Method getOrganizationCompliance
   * @method getOrganizationCompliance
   *
   * @description
   * Reads the organization-wide compliance register summary
   * (`GET /organizations/{organizationId}/compliance`).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to read the summary for.
   *
   * @return {Observable<ComplianceSummaryOutput>} The organization rollup summary.
   */
  public getOrganizationCompliance(organizationId: string): Observable<ComplianceSummaryOutput> {
    return this.getOne<ComplianceSummaryOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/compliance`,
    );
  }

  /**
   * Method getFacilityCompliance
   * @method getFacilityCompliance
   *
   * @description
   * Reads a single facility's compliance register summary
   * (`GET /organizations/{organizationId}/facilities/{facilityId}/compliance`).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} facilityId - The facility to read the summary for.
   *
   * @return {Observable<ComplianceSummaryOutput>} The single-facility summary.
   */
  public getFacilityCompliance(
    organizationId: string,
    facilityId: string,
  ): Observable<ComplianceSummaryOutput> {
    return this.getOne<ComplianceSummaryOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/facilities/${facilityId}/compliance`,
    );
  }

  /**
   * Method exportOrganizationSafetyRegister
   * @method exportOrganizationSafetyRegister
   *
   * @description
   * Reads the organization-wide "registre de sécurité" PDF
   * (`GET /organizations/{organizationId}/compliance/export`). Calls
   * `this.http` directly, like `InterventionService.downloadAttachment`, for
   * a response shape (`responseType: 'blob'`) the base class does not
   * support.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to export the register for.
   *
   * @return {Observable<Blob>} The exported PDF's binary content.
   */
  public exportOrganizationSafetyRegister(organizationId: string): Observable<Blob> {
    return this.http.get(
      this.buildUrl(`${ComplianceService.BASE_PATH}/${organizationId}/compliance/export`),
      { responseType: 'blob', withCredentials: true },
    );
  }

  /**
   * Method exportFacilitySafetyRegister
   * @method exportFacilitySafetyRegister
   *
   * @description
   * Reads one facility's "registre de sécurité" PDF
   * (`GET /organizations/{organizationId}/facilities/{facilityId}/compliance/export`).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} facilityId - The facility to export the register for.
   *
   * @return {Observable<Blob>} The exported PDF's binary content.
   */
  public exportFacilitySafetyRegister(
    organizationId: string,
    facilityId: string,
  ): Observable<Blob> {
    return this.http.get(
      this.buildUrl(
        `${ComplianceService.BASE_PATH}/${organizationId}/facilities/${facilityId}/compliance/export`,
      ),
      { responseType: 'blob', withCredentials: true },
    );
  }
  //#endregion
}
