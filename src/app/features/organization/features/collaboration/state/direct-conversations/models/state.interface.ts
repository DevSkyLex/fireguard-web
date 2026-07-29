import type { CallState } from '@core/request-state';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';

/**
 * Interface DirectConversationsState
 * @interface DirectConversationsState
 *
 * @description
 * Auxiliary state for the direct-conversations store. The rows themselves live
 * in the `withEntities` collection, keyed by their scalar `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DirectConversationsState {
  /** Organization the loaded list belongs to, or `null` before the first load. */
  readonly organizationId: string | null;
  /** Server-reported total. */
  readonly total: number;
  /** `GET /api/direct-conversations` — the only source of `counterpartMember`. */
  readonly listCallState: CallState;
  /**
   * `POST /api/direct-conversations`. Its response carries no
   * `counterpartMember`, so a success triggers a list reload rather than an
   * entity insert — the row would otherwise render unlabeled.
   */
  readonly openCallState: CallState<ConversationOutput>;
}
