import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { ComplianceSummaryOutput } from '@features/organization/features/compliance/models';

/**
 * Service ComplianceService
 * @class ComplianceService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the compliance register: the organization rollup and its
 * per-facility breakdown.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class ComplianceService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
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
   * Method getSummary
   * @method getSummary
   *
   * @description
   * Fetches the organization's compliance register. Requires
   * `organization.compliance.read`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<ComplianceSummaryOutput>} An observable emitting the register.
   */
  public getSummary(organizationId: string): Observable<ComplianceSummaryOutput> {
    return this.getOne<ComplianceSummaryOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/compliance`,
    );
  }
  //#endregion
}
