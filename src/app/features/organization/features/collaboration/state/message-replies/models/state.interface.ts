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
  /** Root message the open thread belongs to, or `null` when no thread is open. */
  readonly parentMessageId: string | null;
  /** Server-reported total. Paging must be driven from this, not the row count. */
  readonly total: number;
  /** Highest page fetched so far; replies come back oldest-first, like messages. */
  readonly loadedPage: number;
  /** `GET /messages/{id}/replies`. */
  readonly listCallState: CallState;
  /** `POST /messages/{id}/replies`. */
  readonly postCallState: CallState;
}
