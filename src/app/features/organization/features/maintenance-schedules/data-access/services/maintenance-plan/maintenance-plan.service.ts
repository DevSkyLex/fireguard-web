import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  CreateMaintenancePlanInput,
  MaintenanceEngineOutput,
  MaintenancePlanGenerationOutput,
  MaintenancePlanOutput,
  MaintenancePlanPreviewOutput,
  UpdateMaintenancePlanInput,
} from '@features/organization/features/maintenance-schedules/models';

/**
 * Class MaintenancePlanService
 * @class MaintenancePlanService
 *
 * @description
 * Organization-scoped transport for equipment operation plans and scheduling authority.
 */
@Service()
export class MaintenancePlanService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Reads a server-filtered page of operation plans.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {RequestOptions} [options] - Server search, filters and pagination.
   *
   * @returns {Observable<HydraCollection<MaintenancePlanOutput>>} Authorized plan page.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MaintenancePlanOutput>> {
    return this.getCollection<MaintenancePlanOutput>(this.path(organizationId), options);
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Prepares an inactive plan for server preview before activation.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {CreateMaintenancePlanInput} input - Equipment operation draft.
   *
   * @returns {Observable<MaintenancePlanOutput>} Prepared plan.
   */
  public create(
    organizationId: string,
    input: CreateMaintenancePlanInput,
  ): Observable<MaintenancePlanOutput> {
    return this.post<CreateMaintenancePlanInput, MaintenancePlanOutput>(
      this.path(organizationId),
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Configures or explicitly activates one plan.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} planId - Plan identity.
   * @param {UpdateMaintenancePlanInput} input - Mutable operation configuration.
   *
   * @returns {Observable<MaintenancePlanOutput>} Updated authoritative plan.
   */
  public update(
    organizationId: string,
    planId: string,
    input: UpdateMaintenancePlanInput,
  ): Observable<MaintenancePlanOutput> {
    return this.patch<UpdateMaintenancePlanInput, MaintenancePlanOutput>(
      this.path(organizationId, planId),
      input,
    );
  }

  /**
   * Method preview
   * @method preview
   *
   * @description
   * Reads three server-calculated future dates without advancing the plan.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} planId - Plan to review.
   *
   * @returns {Observable<MaintenancePlanPreviewOutput>} Authoritative preview dates.
   */
  public preview(organizationId: string, planId: string): Observable<MaintenancePlanPreviewOutput> {
    return this.http.get<MaintenancePlanPreviewOutput>(
      this.buildUrl(`${this.path(organizationId, planId)}/preview`),
      { headers: this.buildHeaders(), withCredentials: true },
    );
  }

  /**
   * Method generate
   * @method generate
   *
   * @description
   * Creates or recovers bounded work for a single plan; retry is always explicit.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} planId - Due equipment operation.
   * @param {boolean} retry - Requests a new attempt after a server-recognized failure.
   *
   * @returns {Observable<MaintenancePlanGenerationOutput>} Work result.
   */
  public generate(
    organizationId: string,
    planId: string,
    retry: boolean,
  ): Observable<MaintenancePlanGenerationOutput> {
    return this.http.post<MaintenancePlanGenerationOutput>(
      this.buildUrl(`${this.path(organizationId, planId)}/generate`),
      { retry },
      { headers: this.buildHeaders(), withCredentials: true },
    );
  }

  /**
   * Method engine
   * @method engine
   *
   * @description
   * Reads the organization's sole active scheduling authority.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   *
   * @returns {Observable<MaintenanceEngineOutput>} Current engine state.
   */
  public engine(organizationId: string): Observable<MaintenanceEngineOutput> {
    return this.http.get<MaintenanceEngineOutput>(
      this.buildUrl(`/api/organizations/${organizationId}/maintenance/engine`),
      { headers: this.buildHeaders(), withCredentials: true },
    );
  }

  /**
   * Method prepareLegacy
   * @method prepareLegacy
   *
   * @description
   * Prepares historical control plans without changing the active engine.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   *
   * @returns {Observable<MaintenanceEngineOutput>} Preparation state.
   */
  public prepareLegacy(organizationId: string): Observable<MaintenanceEngineOutput> {
    return this.http.post<MaintenanceEngineOutput>(
      this.buildUrl(`${this.path(organizationId)}/prepare-legacy`),
      {},
      { headers: this.buildHeaders(), withCredentials: true },
    );
  }

  /**
   * Method activateEngine
   * @method activateEngine
   *
   * @description
   * Explicitly switches authority after the server verifies historical conflicts.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   *
   * @returns {Observable<MaintenanceEngineOutput>} Confirmed engine state.
   */
  public activateEngine(organizationId: string): Observable<MaintenanceEngineOutput> {
    return this.http.post<MaintenanceEngineOutput>(
      this.buildUrl(`${this.path(organizationId)}/activate`),
      {},
      { headers: this.buildHeaders(), withCredentials: true },
    );
  }

  /**
   * Method path
   * @method path
   *
   * @description
   * Builds the organization-owned plan resource path.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} [planId] - Optional plan identity.
   *
   * @returns {string} Resource path.
   */
  private path(organizationId: string, planId?: string): string {
    const base: string = `/api/organizations/${organizationId}/maintenance/plans`;
    return planId ? `${base}/${planId}` : base;
  }
  //#endregion
}
