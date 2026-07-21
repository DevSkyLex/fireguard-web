import type { HydraItem } from '@core/api/models';

/**
 * One daily bucket of a conversation's activity heatmap
 * (`GET /api/conversations/{conversationId}/activity`).
 *
 * The API zero-fills: every requested bucket is present, oldest first, the last
 * one being today (UTC). An empty day is `count: 0`, never an omitted row — so
 * a gap in the returned list means a transport problem, not a quiet day.
 *
 * @since 1.4.0
 */
export interface ConversationActivityBucket extends HydraItem {
  /** The bucket's calendar day, UTC, `YYYY-MM-DD`. Doubles as the row's identifier. */
  readonly bucket: string;

  /** Messages posted that day, threaded replies and tombstoned rows included. */
  readonly count: number;
}
