import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { PasswordPolicyOutput } from '@features/auth/models';

/**
 * Class PasswordPolicyService
 * @class PasswordPolicyService
 *
 * @description
 * Reads the authoritative public password policy used by all password creation surfaces.
 */
@Service()
export class PasswordPolicyService extends HydraApiService {
  /**
   * Method policy
   *
   * @description
   * Currently loaded public password creation policy.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<PasswordPolicyOutput>} Result of the current operation.
   */
  public policy(): Observable<PasswordPolicyOutput> {
    return this.getOne<PasswordPolicyOutput>('/api/auth/password-policy');
  }
}
