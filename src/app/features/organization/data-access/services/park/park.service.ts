import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import type { NonConformityOutput } from '@features/organization/features/inspections/models';
import type { ParkAnomaliesSummaryOutput } from '@features/organization/models';

/**
 * Class ParkService
 * @class ParkService
 *
 * @description
 * Organization-owned read transport for the specialized park action queues.
 *
 * @since unreleased
 */
@Service()
export class ParkService extends HydraApiService {
  //#region Methods
  /**
   * Method anomaliesSummary
   * @method
   *
   * @description
   * Reads unresolved anomaly counts with explicit equipment family, customer and site filters.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for every scoped
   *   request.
   * @param {RequestOptions} options - Value supplied by the owning park workflow.
   *
   * @returns {Observable<ParkAnomaliesSummaryOutput>} Result consumed by the owning park workflow.
   */
  public anomaliesSummary(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<ParkAnomaliesSummaryOutput> {
    return this.getOne<ParkAnomaliesSummaryOutput>(
      `/api/organizations/${organizationId}/park-anomalies-summary`,
      options,
    );
  }
  /**
   * Method anomalies
   * @method
   *
   * @description
   * Reads one exact page of published open or in-progress anomalies in the retained park scope.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for every scoped
   *   request.
   * @param {RequestOptions} options - Value supplied by the owning park workflow.
   *
   * @returns {Observable<HydraCollection<NonConformityOutput>>} Result consumed by the owning park
   *   workflow.
   */
  public anomalies(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<NonConformityOutput>> {
    return this.getCollection<NonConformityOutput>(
      `/api/organizations/${organizationId}/park-anomalies`,
      options,
    );
  }
  //#endregion
}
