import type { HydraItem } from '@core/api/models';
import type { CalendarFeedItem } from './calendar-feed-item.interface';

/**
 * The merged calendar feed for a window.
 *
 * @since 1.0.0
 */
export interface CalendarFeedOutput extends HydraItem {
  readonly from: string;
  readonly to: string;
  readonly items: readonly CalendarFeedItem[];
}
