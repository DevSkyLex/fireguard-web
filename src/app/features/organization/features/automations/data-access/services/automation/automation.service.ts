import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  AutomationAttemptOutput,
  AutomationPolicyOutput,
} from '@features/organization/features/automations/models';

/**
 * Service AutomationService
 * @class AutomationService
 * @extends {HydraApiService}
 * @description Organization-scoped policy, history and fenced retry transport.
 * @since 1.0.0
 */
@Service()
export class AutomationService extends HydraApiService {
  /**
   * Method policy
   * @description Reads the effective automation rule and management capability.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Current workspace.
   * @returns {Observable<AutomationPolicyOutput>} Current server policy.
   */
  public policy(organizationId: string): Observable<AutomationPolicyOutput> {
    return this.getOne<AutomationPolicyOutput>(`/api/organizations/${organizationId}/automation`);
  }
  /**
   * Method list
   * @description Reads one server-counted page of attempts.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Current workspace.
   * @param {number} page - One-based page.
   * @returns {Observable<HydraCollection<AutomationAttemptOutput>>} Scoped results.
   */
  public list(
    organizationId: string,
    page: number,
  ): Observable<HydraCollection<AutomationAttemptOutput>> {
    return this.getCollection<AutomationAttemptOutput>(
      `/api/organizations/${organizationId}/automation/runs`,
      { page, itemsPerPage: 20 },
    );
  }
  /**
   * Method retry
   * @description Requests one new attempt with the original action identity.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Current workspace.
   * @param {AutomationAttemptOutput} attempt - Failed server row with its precondition.
   * @returns {Observable<AutomationAttemptOutput>} Accepted new attempt.
   */
  public retry(
    organizationId: string,
    attempt: AutomationAttemptOutput,
  ): Observable<AutomationAttemptOutput> {
    return this.post<{ attemptId: string }, AutomationAttemptOutput>(
      `/api/organizations/${organizationId}/automation/runs/${attempt.runId}/retry`,
      { attemptId: attempt.id },
    );
  }
}
