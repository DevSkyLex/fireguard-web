import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ListPresenceQuery,
  PingPresenceInput,
  PingPresenceOutput,
  PresenceOutput,
} from '@features/organization/features/collaboration/models';

/**
 * Largest batch `GET /api/presence` accepts, after the server trims and
 * deduplicates the ids. Asking for more is a `400`, not a truncation.
 */
export const PRESENCE_BATCH_SIZE = 100;

/**
 * Service PresenceService
 * @class PresenceService
 * @extends {HydraApiService}
 *
 * @description
 * Transport boundary for member presence.
 *
 * Presence has no database behind it: a ping writes a cache key with a 90
 * second lifetime and a read asks whether that key still exists. Nothing is
 * historical, and `online: false` covers both "left a minute ago" and "never
 * seen".
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class PresenceService extends HydraApiService {
  //#region Properties
  /**
   * Property endpoint
   * @readonly
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
  //#endregion
}
