import type { HydraItem } from '@core/api/models';
import type { CalendarFeedItemOutput } from './calendar-feed-item-output.interface';

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
  //#endregion
}
