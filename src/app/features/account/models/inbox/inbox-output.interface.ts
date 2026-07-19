import type { HydraItem } from '@core/api/models';
import type { InboxItem } from './inbox-item.interface';

/**
 * A cursor-paginated page of the unified inbox.
 *
 * @since 1.0.0
 */
export interface InboxOutput extends HydraItem {
  readonly items: readonly InboxItem[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}
