import type { HydraItem } from '@core/api/models';

/**
 * Interface NotificationCountOutput
 * @interface NotificationCountOutput
 *
 * @description
 * A count, returned by both `GET /notifications/unread-count` and
 * `PATCH /notifications/read-all` — the two operations share this shape.
 *
 * @since 1.0.0
 */
export interface NotificationCountOutput extends HydraItem {
  readonly count: number;
}
