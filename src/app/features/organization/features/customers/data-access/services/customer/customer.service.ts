import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import type {
  CustomerInput,
  CustomerOutput,
} from '@features/organization/features/customers/models';

/**
 * Class CustomerService
 * @class CustomerService
 *
 * @description
 * Hydra transport for internal customers with revision-checked mutations.
 *
 * @since unreleased
 */
@Service()
export class CustomerService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method
   *
   * @description
   * Reads a server-paginated customer directory.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for the request.
   * @param {RequestOptions} options - Value supplied by the owning customer workflow.
   *
   * @returns {Observable<HydraCollection<CustomerOutput>>} Result for the owning customer workflow.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<CustomerOutput>> {
    return this.getCollection<CustomerOutput>(
      `/api/organizations/${organizationId}/customers`,
      options,
    );
  }

  /**
   * Method get
   * @method
   *
   * @description
   * Reads the selected record even when it is archived or outside the current page.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for the request.
   * @param {string} customerId - Value supplied by the owning customer workflow.
   *
   * @returns {Observable<CustomerOutput>} Result for the owning customer workflow.
   */
  public get(organizationId: string, customerId: string): Observable<CustomerOutput> {
    return this.getOne<CustomerOutput>(
      `/api/organizations/${organizationId}/customers/${customerId}`,
    );
  }

  /**
   * Method create
   * @method
   *
   * @description
   * Creates an internal customer.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for the request.
   * @param {CustomerInput} input - Value supplied by the owning customer workflow.
   *
   * @returns {Observable<CustomerOutput>} Result for the owning customer workflow.
   */
  public create(organizationId: string, input: CustomerInput): Observable<CustomerOutput> {
    return this.post<CustomerInput, CustomerOutput>(
      `/api/organizations/${organizationId}/customers`,
      input,
    );
  }

  /**
   * Method update
   * @method
   *
   * @description
   * Updates a customer only against the displayed revision.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for the request.
   * @param {CustomerOutput} customer - Value supplied by the owning customer workflow.
   * @param {CustomerInput} input - Value supplied by the owning customer workflow.
   *
   * @returns {Observable<CustomerOutput>} Result for the owning customer workflow.
   */
  public update(
    organizationId: string,
    customer: CustomerOutput,
    input: CustomerInput,
  ): Observable<CustomerOutput> {
    return this.patch<CustomerInput, CustomerOutput>(
      `/api/organizations/${organizationId}/customers/${customer.id}`,
      input,
      { headers: { 'If-Match': `"revision-${customer.revision}"` } },
    );
  }

  /**
   * Method archive
   * @method
   *
   * @description
   * Archives an internal customer while preserving existing site links.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for the request.
   * @param {CustomerOutput} customer - Value supplied by the owning customer workflow.
   *
   * @returns {Observable<CustomerOutput>} Result for the owning customer workflow.
   */
  public archive(organizationId: string, customer: CustomerOutput): Observable<CustomerOutput> {
    return this.post<Record<string, never>, CustomerOutput>(
      `/api/organizations/${organizationId}/customers/${customer.id}/archive`,
      {},
      { headers: { 'If-Match': `"revision-${customer.revision}"` } },
    );
  }

  /**
   * Method restore
   * @method
   *
   * @description
   * Restores a customer for new assignments.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization used as the authority for the request.
   * @param {CustomerOutput} customer - Value supplied by the owning customer workflow.
   *
   * @returns {Observable<CustomerOutput>} Result for the owning customer workflow.
   */
  public restore(organizationId: string, customer: CustomerOutput): Observable<CustomerOutput> {
    return this.post<Record<string, never>, CustomerOutput>(
      `/api/organizations/${organizationId}/customers/${customer.id}/restore`,
      {},
      { headers: { 'If-Match': `"revision-${customer.revision}"` } },
    );
  }
  //#endregion
}
