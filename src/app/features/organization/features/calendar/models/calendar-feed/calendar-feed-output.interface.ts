import type { HydraItem } from '@core/api/models';
import type { CalendarFeedItemOutput } from './calendar-feed-item-output.interface';
import type { CalendarFeedSourceOutput } from './calendar-feed-source-output.interface';

/**
 * Interface CalendarFeedOutput
 * @interface CalendarFeedOutput
 *
 * @description
 * The unified feed for one date window, mirroring the backend's
 * `CalendarFeedOutput`: the echoed bounds and the merged, source-tagged items.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarFeedOutput extends HydraItem {
  //#region Properties
  /** Echoed inclusive lower bound (ISO). */
  readonly from: string;

  /** Echoed inclusive upper bound (ISO). */
  readonly to: string;

  /** The merged entries, every source together. */
  readonly items: readonly CalendarFeedItemOutput[];

  /**
   * Property complete
   * @readonly
   * @description All authorized sources succeeded without truncation; optional during the additive backend rollout.
   * @access public
   * @since 1.0.0
   * @type {boolean | undefined}
   */
  readonly complete?: boolean;

  /**
   * Property sources
   * @readonly
   * @description Authorized source statuses; denied sources are omitted by the server.
   * @access public
   * @since 1.0.0
   * @type {readonly CalendarFeedSourceOutput[] | undefined}
   */
  readonly sources?: readonly CalendarFeedSourceOutput[];
  //#endregion
}
