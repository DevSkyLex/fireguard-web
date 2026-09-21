import { Service } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { InboxOutput, InboxUnreadCountOutput } from '@features/account/models';

/**
 * Service InboxService
 * @class InboxService
 * @description Reads source-owned inbox entries without interpreting the server cursor.
 * @since 1.0.0
 */
@Service()
export class InboxService extends HydraApiService {
  /**
   * Method list
   * @description Fetches one page in the specified workspace or the account scope.
   * @access public
   * @since 1.0.0
   * @param {string | null} organizationId - Workspace scope.
   * @param {string | null} cursor - Opaque server token.
   * @returns {Observable<InboxOutput>} Server-ordered page and completeness.
   */
  public list(organizationId: string | null, cursor: string | null): Observable<InboxOutput> {
    return this.getOne<InboxOutput>('/api/inbox', {
      params: {
        limit: 20,
        ...(organizationId ? { organization: organizationId } : {}),
        ...(cursor ? { cursor } : {}),
      },
    });
  }

  /**
   * Method unreadCount
   * @description Reads the count from all contributors in the same scope as the feed.
   * @access public
   * @since 1.0.0
   * @param {string | null} organizationId - Workspace scope.
   * @returns {Observable<number>} Server count.
   */
  public unreadCount(organizationId: string | null): Observable<number> {
    return this.getOne<InboxUnreadCountOutput>('/api/inbox/unread-count', {
      params: organizationId ? { organization: organizationId } : {},
    }).pipe(map((result) => result.unreadCount));
  }
}
