import type { CallState } from '@core/request-state';
import type { InboxOutput } from '@features/account/models';
/**
 * Interface InboxState
 * @interface InboxState
 * @description Account and organization scope, opaque pagination and explicit request states for the unified inbox.
 * @since 1.0.0
 */
export interface InboxState {
  /**
   * Property accountId
   * @readonly
   * @description Authenticated account owning the cache.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly accountId: string | null;

  /**
   * Property organizationId
   * @readonly
   * @description Workspace scope; null selects account-wide notifications.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property revision
   * @readonly
   * @description Generation that invalidates stale responses.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property activated
   * @readonly
   * @description Whether a visible inbox has requested its feed.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly activated: boolean;

  /**
   * Property nextPageCursor
   * @readonly
   * @description Unmodified server cursor for load-more.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly nextPageCursor: string | null;

  /**
   * Property complete
   * @readonly
   * @description Whether the last page had all sources.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly complete: boolean;

  /**
   * Property unreadCount
   * @readonly
   * @description Server count independent of the loaded page.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly unreadCount: number;

  /**
   * Property listCallState
   * @readonly
   * @description First-page read status.
   * @access public
   * @since 1.0.0
   * @type {CallState<InboxOutput>}
   */
  readonly listCallState: CallState<InboxOutput>;

  /**
   * Property moreCallState
   * @readonly
   * @description Next-page read status.
   * @access public
   * @since 1.0.0
   * @type {CallState<InboxOutput>}
   */
  readonly moreCallState: CallState<InboxOutput>;

  /**
   * Property countCallState
   * @readonly
   * @description Independent server badge query.
   * @access public
   * @since 1.0.0
   * @type {CallState<number>}
   */
  readonly countCallState: CallState<number>;

  /**
   * Property readCallState
   * @readonly
   * @description Notification acknowledgement status.
   * @access public
   * @since 1.0.0
   * @type {CallState}
   */
  readonly readCallState: CallState;
}
