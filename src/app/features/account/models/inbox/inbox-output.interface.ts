import type { HydraItem } from '@core/api/models';
import type { InboxItemOutput } from './inbox-item-output.interface';
/**
 * Interface InboxOutput
 * @interface InboxOutput
 * @description Cursor-paginated inbox response; the cursor is opaque to the client.
 * @since 1.0.0
 */
export interface InboxOutput extends HydraItem {
  /**
   * Property items
   * @readonly
   * @description Entries in server order.
   * @access public
   * @since 1.0.0
   * @type {readonly InboxItemOutput[]}
   */
  readonly items: readonly InboxItemOutput[];

  /**
   * Property nextPageCursor
   * @readonly
   * @description Token to echo unchanged on the next request.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly nextPageCursor: string | null;

  /**
   * Property hasMore
   * @readonly
   * @description Whether another page exists.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly hasMore: boolean;

  /**
   * Property complete
   * @readonly
   * @description Whether every source was available; partial pages must be retried.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly complete: boolean;
}
