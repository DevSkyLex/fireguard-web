import type { HydraItem } from '@core/api/models';

/**
 * Interface CalendarFeedTokenSecretOutput
 * @interface CalendarFeedTokenSecretOutput
 *
 * @description
 * The single response that ever carries the raw feed secret — the 201 of the
 * create/rotate endpoint, mirroring the backend's
 * `CalendarFeedTokenSecretOutput`. The backend only keeps a hash afterwards,
 * so this payload cannot be re-read.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarFeedTokenSecretOutput extends HydraItem {
  //#region Properties
  /** The raw feed secret, shown once. */
  readonly secret: string;

  /** The complete, subscribable `.ics` URL embedding the secret. */
  readonly feedUrl: string;

  /** When this token was created (ISO). */
  readonly createdAt: string;

  /** Whether this creation revoked a previously active token. */
  readonly rotated: boolean;
  //#endregion
}
