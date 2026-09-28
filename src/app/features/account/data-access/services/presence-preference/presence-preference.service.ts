import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  PresencePreferenceInput,
  PresencePreferenceOutput,
  PresencePreferenceSubscriptionOutput,
} from '@features/account/models/presence-preference';

/**
 * Service PresencePreferenceService
 * @class PresencePreferenceService
 * @description Transports the signed-in account's global presence preference and private subscription.
 * @since 1.0.0
 */
@Service()
export class PresencePreferenceService extends HydraApiService {
  /**
   * Method getPreference
   * @method getPreference
   * @description Reads the canonical preference; the session identifies its owner.
   * @access public
   * @since 1.0.0
   * @returns {Observable<PresencePreferenceOutput>} Confirmed preference.
   */
  public getPreference(): Observable<PresencePreferenceOutput> {
    return this.getOne<PresencePreferenceOutput>('/api/me/presence-preference');
  }

  /**
   * Method updatePreference
   * @method updatePreference
   * @description Persists one explicit preference and returns its committed revision.
   * @access public
   * @since 1.0.0
   * @param {PresencePreferenceInput} input - Requested global preference.
   * @returns {Observable<PresencePreferenceOutput>} Confirmed preference.
   */
  public updatePreference(
    input: Partial<PresencePreferenceInput>,
  ): Observable<PresencePreferenceOutput> {
    return this.patch<Partial<PresencePreferenceInput>, PresencePreferenceOutput>(
      '/api/me/presence-preference',
      input,
    );
  }

  /**
   * Method getSubscription
   * @method getSubscription
   * @description Obtains subscribe-only authorization for the caller's private topic.
   * @access public
   * @since 1.0.0
   * @returns {Observable<PresencePreferenceSubscriptionOutput>} Topic, token and expiry.
   */
  public getSubscription(): Observable<PresencePreferenceSubscriptionOutput> {
    return this.getOne<PresencePreferenceSubscriptionOutput>(
      '/api/me/presence-preference/subscription',
    );
  }
}
