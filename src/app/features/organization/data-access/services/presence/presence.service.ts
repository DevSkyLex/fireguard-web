import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ListPresenceQuery,
  PingPresenceInput,
  PingPresenceOutput,
  PresenceOutput,
  PresenceSubscriptionOutput,
} from '@features/organization/models';

/**
 * Service PresenceService
 * @class PresenceService
 * @extends {HydraApiService}
 *
 * @description
 * Transport boundary for member presence.
 *
 * A ping refreshes the shared organization/member cache lease for 90 seconds.
 * Reads combine that lease with the account preference and preserve the legacy online field.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class PresenceService extends HydraApiService {
  //#region Properties
  /**
   * Property endpoint
   * @readonly
   * @description Presence transport base path.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly endpoint: string = '/api/presence';
  //#endregion

  //#region Methods
  /**
   * Method ping
   * @method ping
   *
   * @description
   * Announces that the acting member is here. The member is resolved
   * server-side, so this cannot be sent on anyone else's behalf.
   *
   * Rate-limited to **6 per minute** per user and organization — the only
   * limited endpoint in the whole messaging module. A reconnect storm or a
   * member with several tabs will otherwise hit `429`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PingPresenceInput} input - Organization IRI or bare UUID.
   *
   * @returns {Observable<PingPresenceOutput>} The acting member id and timestamp.
   */
  public ping(input: PingPresenceInput): Observable<PingPresenceOutput> {
    return this.post<PingPresenceInput, PingPresenceOutput>(`${this.endpoint}/ping`, input);
  }

  /**
   * Method list
   * @method list
   *
   * @description
   * Reads presence for an explicit set of members.
   *
   * Both parameters are required and `memberIds` must be **bare** UUIDs — the
   * provider parses IRIs for `organization` only. Callers holding member IRIs
   * must strip them first.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ListPresenceQuery} query - Organization and up to 100 member ids.
   *
   * @returns {Observable<HydraCollection<PresenceOutput>>} One row per requested id, in order.
   */
  public list(query: ListPresenceQuery): Observable<HydraCollection<PresenceOutput>> {
    return this.getCollection<PresenceOutput>(this.endpoint, {
      params: { organization: query.organization, memberIds: query.memberIds.join(',') },
    });
  }
  /**
   * Method getSubscription
   * @method getSubscription
   * @description Authorizes the selected organization's private presence topic.
   * @access public
   * @since 1.0.0
   * @param {string} organization - Organization UUID.
   * @returns {Observable<PresenceSubscriptionOutput>} Credentials and their expiration deadline.
   */
  public getSubscription(organization: string): Observable<PresenceSubscriptionOutput> {
    return this.getOne<PresenceSubscriptionOutput>(`${this.endpoint}/subscription`, {
      params: { organization },
    });
  }
  //#endregion
}
