import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { EmailOwnershipOutput, EmailOwnershipChallengeOutput } from '@features/auth/models';
/**
 * Service EmailOwnershipService
 * @class EmailOwnershipService
 * @description Requests and confirms possession of the signed-in user's current mailbox.
 * @since 1.0.0
 */
@Service()
export class EmailOwnershipService extends HydraApiService {
  /**
   * Method status
   * @method status
   * @description Reads whether mailbox ownership has been explicitly confirmed.
   * @access public
   * @since 1.0.0
   * @returns {Observable<EmailOwnershipOutput>} Current proof status.
   */
  public status(): Observable<EmailOwnershipOutput> {
    return this.getOne<EmailOwnershipOutput>('/api/auth/email-ownership');
  }
  /**
   * Method start
   * @method start
   * @description Sends a user-bound verification code to the current account mailbox.
   * @access public
   * @since 1.0.0
   * @returns {Observable<EmailOwnershipChallengeOutput>} Transient challenge and resend delay.
   */
  public start(): Observable<EmailOwnershipChallengeOutput> {
    return this.postAction<EmailOwnershipChallengeOutput>('/api/auth/email-ownership/start');
  }
  /**
   * Method confirm
   * @method confirm
   * @description Consumes a code belonging to the signed-in account and its current email.
   * @access public
   * @since 1.0.0
   * @param {string} challengeToken - Transient OTP challenge.
   * @param {string} code - Verification digits.
   * @returns {Observable<EmailOwnershipOutput>} Confirmed mailbox status.
   */
  public confirm(challengeToken: string, code: string): Observable<EmailOwnershipOutput> {
    return this.post<{ challengeToken: string; code: string }, EmailOwnershipOutput>(
      '/api/auth/email-ownership/confirm',
      { challengeToken, code },
    );
  }
}
