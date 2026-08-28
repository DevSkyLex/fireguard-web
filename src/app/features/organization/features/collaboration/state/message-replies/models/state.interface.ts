import type { CallState } from '@core/request-state';

/**
 * Interface MessageRepliesState
 * @interface MessageRepliesState
 *
 * @description
 * Auxiliary state for {@link MessageRepliesStore}. The replies themselves live
 * in the `withEntities` collection, keyed by their scalar `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageRepliesState {
  /** Root message the loaded replies belong to, or `null` before the first load. */
  readonly parentMessageId: string | null;
  /** Server-reported total for the parent's reply collection. */
  readonly total: number;
  /** `GET /messages/{id}/replies`. */
  readonly listCallState: CallState;
  /** `POST /messages/{id}/replies`. */
  readonly postCallState: CallState;
}
