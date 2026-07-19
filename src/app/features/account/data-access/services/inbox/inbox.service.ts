import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { InboxOutput } from '@features/account/models';

/**
 * Service InboxService
 * @class InboxService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the unified inbox — everything needing the signed-in user's
 * attention, merged across sources.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InboxService extends HydraApiService {
  //#region Public Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Reads one page of the inbox, newest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} [organizationId] - Narrow to one organization; omit for everything.
   * @param {string} [cursor] - Page cursor from a previous response.
   *
   * @return {Observable<InboxOutput>} The page.
   */
  public list(organizationId?: string, cursor?: string): Observable<InboxOutput> {
    const params: Record<string, string> = {};
    if (organizationId !== undefined) params['organizationId'] = organizationId;
    if (cursor !== undefined) params['cursor'] = cursor;

    return this.getOne<InboxOutput>('/api/inbox', { params });
  }
  //#endregion
}
