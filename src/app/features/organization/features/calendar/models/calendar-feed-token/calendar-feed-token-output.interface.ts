import type { HydraItem } from '@core/api/models';

/**
 * Interface CalendarFeedTokenOutput
 * @interface CalendarFeedTokenOutput
 *
 * @description
 * The active feed token's metadata, mirroring the backend's
 * `CalendarFeedTokenOutput` — deliberately without the secret, which the API
 * only ever returns once, on creation ({@link CalendarFeedTokenSecretOutput}).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarFeedTokenOutput extends HydraItem {
  //#region Properties
  /** When the active token was created (ISO). */
  readonly createdAt: string;

  /** The last recorded feed fetch (ISO, persisted at most hourly), absent while never fetched. */
  readonly lastUsedAt?: string | null;
  //#endregion
}
