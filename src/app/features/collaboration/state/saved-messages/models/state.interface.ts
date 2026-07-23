import type { CallState } from '@core/request-state';

/**
 * Interface SavedMessagesState
 * @interface SavedMessagesState
 *
 * @description
 * Auxiliary state for {@link SavedMessagesStore}. The bookmarks themselves live
 * in the `withEntities` collection, keyed by their scalar `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SavedMessagesState {
  /** Organization **IRI** the list was loaded for — this endpoint rejects a bare UUID. */
  readonly organization: string | null;
  /** Server-reported total. Paging must be driven from this, not the row count. */
  readonly total: number;
  /** Highest page fetched so far. */
  readonly loadedPage: number;
  /** `GET /api/saved-messages`. */
  readonly listCallState: CallState;
  /** Unsaving, which removes a row from this very list. */
  readonly interactionCallState: CallState;
}
