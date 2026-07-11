import type { ActivityFeedItem } from './activity-feed-item.interface';

/**
 * Type ActivityFeedItemContext
 *
 * @description
 * Template context handed to a template marked `[appActivityFeedItem]`. The
 * entry is exposed as the implicit value, bound through `let-item`.
 *
 * @since 1.0.0
 */
export type ActivityFeedItemContext = {
  /** Entry rendered by this template, bound through `let-item`. */
  readonly $implicit: ActivityFeedItem;
};
