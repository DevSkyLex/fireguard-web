import type { HydraItem } from '@core/api/models';

/**
 * Interface ConversationActivityBucketOutput
 * @interface ConversationActivityBucketOutput
 *
 * @description
 * One zero-filled daily message count, feeding the info panel's activity
 * heatmap. Returned ascending, in UTC.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ConversationActivityBucketOutput extends HydraItem {
  /** `YYYY-MM-DD`, UTC. */
  readonly bucket: string;
  readonly count: number;
}
