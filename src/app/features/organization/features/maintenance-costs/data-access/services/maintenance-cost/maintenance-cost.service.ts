import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import type {
  MaintenanceCostOutput,
  WriteMaintenanceCostPlanningInput,
  CreateMaintenanceExpenseInput,
  MaintenanceCurrencyOutput,
  MaintenanceRateOutput,
  CreateMaintenanceRateInput,
} from '@features/organization/features/maintenance-costs/models';

/**
 * Class MaintenanceCostService
 * @class MaintenanceCostService
 *
 * @description
 * Dedicated financial endpoints preserve exact strings, stable identities and explicit revisions.
 */
@Service()
export class MaintenanceCostService extends HydraApiService {
  //#region Methods
  /**
   * Method readCost
   * @method readCost
   *
   * @description
   * Reads current costs and the immutable private closure snapshot.
   *
   * @access public
   * @since 2026-10-06
   *
   * @param {string} organizationId - Owning organization UUID.
   * @param {string} interventionId - Scoped intervention UUID.
   *
   * @returns {Observable<MaintenanceCostOutput>} Authorized financial dossier.
   */
  public readCost(
    organizationId: string,
    interventionId: string,
  ): Observable<MaintenanceCostOutput> {
    return this.getOne<MaintenanceCostOutput>(
      `/api/organizations/${organizationId}/interventions/${interventionId}/costs`,
    );
  }

  /**
   * Method writePlanning
   * @method writePlanning
   *
   * @description
   * Updates only explicit forecast fields using the displayed independent revision, including
   * revision zero.
   *
   * @access public
   * @since 2026-10-06
   *
   * @param {string} organizationId - Owning organization UUID.
   * @param {string} interventionId - Scoped intervention UUID.
   * @param {WriteMaintenanceCostPlanningInput} input - Explicit nullable forecast fields.
   * @param {number} revision - Displayed forecast revision.
   *
   * @returns {Observable<MaintenanceCostOutput>} Updated dedicated dossier.
   */
  public writePlanning(
    organizationId: string,
    interventionId: string,
    input: WriteMaintenanceCostPlanningInput,
    revision: number,
  ): Observable<MaintenanceCostOutput> {
    return this.patch<WriteMaintenanceCostPlanningInput, MaintenanceCostOutput>(
      `/api/organizations/${organizationId}/interventions/${interventionId}/costs/planning`,
      input,
      { headers: { 'If-Match': `"revision-${revision}"` } },
    );
  }

  /**
   * Method createExpense
   * @method createExpense
   *
   * @description
   * Appends one expense or adjustment; a retry reuses its exact client identity and payload.
   *
   * @access public
   * @since 2026-10-06
   *
   * @param {string} organizationId - Owning organization UUID.
   * @param {string} interventionId - Scoped intervention UUID.
   * @param {CreateMaintenanceExpenseInput} input - Exact immutable declaration.
   *
   * @returns {Observable<MaintenanceCostOutput>} Current costs with the original closure unchanged.
   */
  public createExpense(
    organizationId: string,
    interventionId: string,
    input: CreateMaintenanceExpenseInput,
  ): Observable<MaintenanceCostOutput> {
    return this.post<CreateMaintenanceExpenseInput, MaintenanceCostOutput>(
      `/api/organizations/${organizationId}/interventions/${interventionId}/costs/expenses`,
      input,
    );
  }

  /**
   * Method readCurrency
   * @method readCurrency
   *
   * @description
   * Reads the chosen currency and its server lock.
   *
   * @access public
   * @since 2026-10-06
   *
   * @param {string} organizationId - Owning organization UUID.
   *
   * @returns {Observable<MaintenanceCurrencyOutput>} Current organization currency.
   */
  public readCurrency(organizationId: string): Observable<MaintenanceCurrencyOutput> {
    return this.getOne<MaintenanceCurrencyOutput>(
      `/api/organizations/${organizationId}/maintenance-cost/currency`,
    );
  }

  /**
   * Method writeCurrency
   * @method writeCurrency
   *
   * @description
   * Updates the organization currency before its first financial fact.
   *
   * @access public
   * @since 2026-10-06
   *
   * @param {string} organizationId - Owning organization UUID.
   * @param {string} currency - Uppercase three-letter currency.
   *
   * @returns {Observable<MaintenanceCurrencyOutput>} Confirmed currency and lock.
   */
  public writeCurrency(
    organizationId: string,
    currency: string,
  ): Observable<MaintenanceCurrencyOutput> {
    return this.patch<{ readonly currency: string }, MaintenanceCurrencyOutput>(
      `/api/organizations/${organizationId}/maintenance-cost/currency`,
      { currency },
    );
  }

  /**
   * Method listRates
   * @method listRates
   *
   * @description
   * Lists the immutable rate history using server pagination and optional member scope.
   *
   * @access public
   * @since 2026-10-06
   *
   * @param {string} organizationId - Owning organization UUID.
   * @param {RequestOptions | undefined} options - Server page and member filter.
   *
   * @returns {Observable<HydraCollection<MaintenanceRateOutput>>} Bounded authorized rate page.
   */
  public listRates(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MaintenanceRateOutput>> {
    return this.getCollection<MaintenanceRateOutput>(
      `/api/organizations/${organizationId}/maintenance-cost/rates`,
      options,
    );
  }

  /**
   * Method createRate
   * @method createRate
   *
   * @description
   * Appends an effective rate without replacing earlier rates.
   *
   * @access public
   * @since 2026-10-06
   *
   * @param {string} organizationId - Owning organization UUID.
   * @param {CreateMaintenanceRateInput} input - Stable UUID and exact immutable rate declaration.
   *
   * @returns {Observable<MaintenanceRateOutput>} Created rate or exact replay.
   */
  public createRate(
    organizationId: string,
    input: CreateMaintenanceRateInput,
  ): Observable<MaintenanceRateOutput> {
    return this.post<CreateMaintenanceRateInput, MaintenanceRateOutput>(
      `/api/organizations/${organizationId}/maintenance-cost/rates`,
      input,
    );
  }
  //#endregion
}
