import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ServiceRequestOutput,
  CreateServiceRequestInput,
  UpdateServiceRequestInput,
  QualifyServiceRequestInput,
  DecisionServiceRequestInput,
  ConvertServiceRequestInput,
} from '@features/organization/features/service-requests/models';

/**
 * Class ServiceRequestService
 * @class ServiceRequestService
 *
 * @description
 * Transport for internal repair requests; workflow decisions remain with the owning server.
 *
 * @since unreleased
 */
@Service()
export class ServiceRequestService extends HydraApiService {
  //#region Methods

  /**
   * Method list
   *
   * @description
   * Reads an authorized server page with exact target and workflow filters.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {RequestOptions} options - Pagination, search and declared scope filters.
   *
   * @returns {Observable<HydraCollection<ServiceRequestOutput>>} Server-confirmed request
   *   projection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<ServiceRequestOutput>> {
    return this.getCollection<ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests`,
      options,
    );
  }

  /**
   * Method get
   *
   * @description
   * Reads one request and its retained identity.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {string} requestId - Stable request identity.
   *
   * @returns {Observable<ServiceRequestOutput>} Server-confirmed request projection.
   */
  public get(organizationId: string, requestId: string): Observable<ServiceRequestOutput> {
    return this.getOne<ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests/${requestId}`,
    );
  }

  /**
   * Method create
   *
   * @description
   * Creates a described request without converting it into work.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {CreateServiceRequestInput} input - Validated initial description and target.
   *
   * @returns {Observable<ServiceRequestOutput>} Server-confirmed request projection.
   */
  public create(
    organizationId: string,
    input: CreateServiceRequestInput,
  ): Observable<ServiceRequestOutput> {
    return this.post<CreateServiceRequestInput, ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests`,
      input,
    );
  }

  /**
   * Method update
   *
   * @description
   * Updates editable fields against the displayed revision.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {ServiceRequestOutput} request - Displayed immutable request revision.
   * @param {UpdateServiceRequestInput} input - Explicit validated command payload.
   *
   * @returns {Observable<ServiceRequestOutput>} Server-confirmed request projection.
   */
  public update(
    organizationId: string,
    request: ServiceRequestOutput,
    input: UpdateServiceRequestInput,
  ): Observable<ServiceRequestOutput> {
    return this.patch<UpdateServiceRequestInput, ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests/${request.id}`,
      input,
      { headers: { 'If-Match': `"revision-${request.revision}"` } },
    );
  }

  /**
   * Method qualify
   *
   * @description
   * Explicitly qualifies the request and any site-only equipment choice.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {ServiceRequestOutput} request - Displayed immutable request revision.
   * @param {QualifyServiceRequestInput} input - Explicit validated command payload.
   *
   * @returns {Observable<ServiceRequestOutput>} Server-confirmed request projection.
   */
  public qualify(
    organizationId: string,
    request: ServiceRequestOutput,
    input: QualifyServiceRequestInput,
  ): Observable<ServiceRequestOutput> {
    return this.post<QualifyServiceRequestInput, ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests/${request.id}/qualify`,
      input,
      { headers: { 'If-Match': `"revision-${request.revision}"` } },
    );
  }

  /**
   * Method reject
   *
   * @description
   * Rejects the request with a retained reason.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {ServiceRequestOutput} request - Displayed immutable request revision.
   * @param {DecisionServiceRequestInput} input - Explicit validated command payload.
   *
   * @returns {Observable<ServiceRequestOutput>} Server-confirmed request projection.
   */
  public reject(
    organizationId: string,
    request: ServiceRequestOutput,
    input: DecisionServiceRequestInput,
  ): Observable<ServiceRequestOutput> {
    return this.post<DecisionServiceRequestInput, ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests/${request.id}/reject`,
      input,
      { headers: { 'If-Match': `"revision-${request.revision}"` } },
    );
  }

  /**
   * Method cancel
   *
   * @description
   * Cancels the request with a retained reason.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {ServiceRequestOutput} request - Displayed immutable request revision.
   * @param {DecisionServiceRequestInput} input - Explicit validated command payload.
   *
   * @returns {Observable<ServiceRequestOutput>} Server-confirmed request projection.
   */
  public cancel(
    organizationId: string,
    request: ServiceRequestOutput,
    input: DecisionServiceRequestInput,
  ): Observable<ServiceRequestOutput> {
    return this.post<DecisionServiceRequestInput, ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests/${request.id}/cancel`,
      input,
      { headers: { 'If-Match': `"revision-${request.revision}"` } },
    );
  }

  /**
   * Method convert
   *
   * @description
   * Creates or links corrective work using an unchanged stable conversion identity.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority.
   * @param {ServiceRequestOutput} request - Displayed immutable request revision.
   * @param {ConvertServiceRequestInput} input - Explicit validated command payload.
   *
   * @returns {Observable<ServiceRequestOutput>} Server-confirmed request projection.
   */
  public convert(
    organizationId: string,
    request: ServiceRequestOutput,
    input: ConvertServiceRequestInput,
  ): Observable<ServiceRequestOutput> {
    return this.post<ConvertServiceRequestInput, ServiceRequestOutput>(
      `/api/organizations/${organizationId}/service-requests/${request.id}/convert`,
      input,
      { headers: { 'If-Match': `"revision-${request.revision}"` } },
    );
  }

  //#endregion
}
