import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  OrganizationJoinOptionsOutput,
  OrganizationAccessPolicyOutput,
  OrganizationAccessPolicyInput,
  OrganizationDomainOutput,
  OrganizationAdmissionOutput,
  OrganizationJoinRequestOutput,
  OrganizationJoinRequestCollectionOutput,
} from '@features/organization/models';

/**
 * Service OrganizationAccessService
 * @class OrganizationAccessService
 *
 * @description
 * Transports organization discovery, admission policies, domain proofs and membership requests.
 * All authorization decisions belong to the API; responses contain only caller-visible actions.
 *
 * @since 1.0.0
 */
@Service()
export class OrganizationAccessService extends HydraApiService {
  /**
   * Method options
   * @method options
   * @description Lists private workspace choices for the current identity.
   * @access public
   * @since 1.0.0
   * @returns {Observable<OrganizationJoinOptionsOutput>} Server response.
   */
  public options(): Observable<OrganizationJoinOptionsOutput> {
    return this.getOne<OrganizationJoinOptionsOutput>('/api/organizations/join-options');
  }

  /**
   * Method policy
   * @method policy
   * @description Reads admission settings and roles eligible for immediate membership.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @returns {Observable<OrganizationAccessPolicyOutput>} Server response.
   */
  public policy(organizationId: string): Observable<OrganizationAccessPolicyOutput> {
    return this.getOne<OrganizationAccessPolicyOutput>(
      `/api/organizations/${organizationId}/access-policy`,
    );
  }

  /**
   * Method updatePolicy
   * @method updatePolicy
   * @description Updates the explicit admission policy.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @param {OrganizationAccessPolicyInput} input - Policy and eligible role.
   * @returns {Observable<OrganizationAccessPolicyOutput>} Server response.
   */
  public updatePolicy(
    organizationId: string,
    input: OrganizationAccessPolicyInput,
  ): Observable<OrganizationAccessPolicyOutput> {
    return this.patch<OrganizationAccessPolicyInput, OrganizationAccessPolicyOutput>(
      `/api/organizations/${organizationId}/access-policy`,
      input,
    );
  }

  /**
   * Method addDomain
   * @method addDomain
   * @description Creates a domain ownership challenge.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @param {string} domain - Exact email domain.
   * @returns {Observable<OrganizationDomainOutput>} Server response.
   */
  public addDomain(organizationId: string, domain: string): Observable<OrganizationDomainOutput> {
    return this.post<{ domain: string }, OrganizationDomainOutput>(
      `/api/organizations/${organizationId}/domains`,
      { domain },
    );
  }

  /**
   * Method verifyDomain
   * @method verifyDomain
   * @description Checks the organization-specific DNS TXT record.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @param {string} domainId - Domain challenge identifier.
   * @returns {Observable<OrganizationDomainOutput>} Server response.
   */
  public verifyDomain(
    organizationId: string,
    domainId: string,
  ): Observable<OrganizationDomainOutput> {
    return this.postAction<OrganizationDomainOutput>(
      `/api/organizations/${organizationId}/domains/${domainId}/verify`,
    );
  }

  /**
   * Method removeDomain
   * @method removeDomain
   * @description Removes a domain without removing current members.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @param {string} domainId - Domain identifier.
   * @returns {Observable<void>} Server response.
   */
  public removeDomain(organizationId: string, domainId: string): Observable<void> {
    return this.delete(`/api/organizations/${organizationId}/domains/${domainId}`);
  }

  /**
   * Method join
   * @method join
   * @description Explicitly admits the current user when the server policy permits it.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Selected organization.
   * @returns {Observable<OrganizationAdmissionOutput>} Server response.
   */
  public join(organizationId: string): Observable<OrganizationAdmissionOutput> {
    return this.postAction<OrganizationAdmissionOutput>(
      `/api/organizations/${organizationId}/join`,
    );
  }

  /**
   * Method acceptInvitation
   * @method acceptInvitation
   * @description Accepts an invitation addressed to the authenticated identity.
   * @access public
   * @since 1.0.0
   * @param {string} invitationId - Invitation identifier without its secret.
   * @returns {Observable<OrganizationAdmissionOutput>} Server response.
   */
  public acceptInvitation(invitationId: string): Observable<OrganizationAdmissionOutput> {
    return this.postAction<OrganizationAdmissionOutput>(
      `/api/organizations/invitations/${invitationId}/accept`,
    );
  }

  /**
   * Method request
   * @method request
   * @description Requests membership without reserving a member seat.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Selected organization.
   * @returns {Observable<OrganizationJoinRequestOutput>} Server response.
   */
  public request(organizationId: string): Observable<OrganizationJoinRequestOutput> {
    return this.postAction<OrganizationJoinRequestOutput>(
      `/api/organizations/${organizationId}/join-requests`,
    );
  }

  /**
   * Method requests
   * @method requests
   * @description Lists requests visible to an organization administrator.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @returns {Observable<OrganizationJoinRequestCollectionOutput>} Server response.
   */
  public requests(organizationId: string): Observable<OrganizationJoinRequestCollectionOutput> {
    return this.getOne<OrganizationJoinRequestCollectionOutput>(
      `/api/organizations/${organizationId}/join-requests`,
    );
  }

  /**
   * Method myRequests
   * @method myRequests
   * @description Lists membership requests belonging to the current account.
   * @access public
   * @since 1.0.0
   * @returns {Observable<HydraCollection<OrganizationJoinRequestOutput>>} Server response.
   */
  public myRequests(): Observable<HydraCollection<OrganizationJoinRequestOutput>> {
    return this.getCollection<OrganizationJoinRequestOutput>('/api/organizations/join-requests');
  }

  /**
   * Method cancel
   * @method cancel
   * @description Cancels the current user's pending request.
   * @access public
   * @since 1.0.0
   * @param {string} requestId - Owned request identifier.
   * @returns {Observable<OrganizationJoinRequestOutput>} Server response.
   */
  public cancel(requestId: string): Observable<OrganizationJoinRequestOutput> {
    return this.postAction<OrganizationJoinRequestOutput>(
      `/api/organizations/join-requests/${requestId}/cancel`,
    );
  }

  /**
   * Method approve
   * @method approve
   * @description Approves a request with explicitly assignable organization roles.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @param {string} requestId - Pending request.
   * @param {string[]} roleIds - Roles selected by the reviewer.
   * @returns {Observable<OrganizationJoinRequestOutput>} Server response.
   */
  public approve(
    organizationId: string,
    requestId: string,
    roleIds: string[],
  ): Observable<OrganizationJoinRequestOutput> {
    return this.post<{ roleIds: string[] }, OrganizationJoinRequestOutput>(
      `/api/organizations/${organizationId}/join-requests/${requestId}/approve`,
      { roleIds },
    );
  }

  /**
   * Method reject
   * @method reject
   * @description Rejects a pending request.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization identifier.
   * @param {string} requestId - Pending request.
   * @returns {Observable<OrganizationJoinRequestOutput>} Server response.
   */
  public reject(
    organizationId: string,
    requestId: string,
  ): Observable<OrganizationJoinRequestOutput> {
    return this.postAction<OrganizationJoinRequestOutput>(
      `/api/organizations/${organizationId}/join-requests/${requestId}/reject`,
    );
  }
}
