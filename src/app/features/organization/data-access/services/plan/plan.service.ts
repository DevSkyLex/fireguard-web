import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { HydraApiService, type RequestOptions } from '@core/services/hydra-api';
import type { PlanOutput } from '@features/organization/models';

/**
 * Service PlanService
 * @class PlanService
 * @extends {HydraApiService}
 *
 * @description
 * API service for the subscription plan catalog. Regular users can list the
 * selectable plans and read a single plan for self-service plan selection.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class PlanService extends HydraApiService {
  //#region Constants
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base API path for all plan-related endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/plans';
  //#endregion

  //#region Public Methods
  /**
   * Method listAvailable
   * @method listAvailable
   *
   * @description
   * Retrieves the subscription plans the authenticated user can select. Returns
   * only selectable plans for regular users.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional request parameters.
   *
   * @return {Observable<HydraCollection<PlanOutput>>} An observable emitting the plans collection.
   */
  public listAvailable(options?: RequestOptions): Observable<HydraCollection<PlanOutput>> {
    return this.getCollection<PlanOutput>(PlanService.BASE_PATH, options);
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single subscription plan by its identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - The unique identifier of the plan.
   *
   * @return {Observable<PlanOutput>} An observable emitting the plan.
   */
  public get(id: string): Observable<PlanOutput> {
    return this.getOne<PlanOutput>(`${PlanService.BASE_PATH}/${id}`);
  }
  //#endregion
}
