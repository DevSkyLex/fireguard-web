import type { CallState } from '@core/request-state';
import type { ChannelOutput } from '@features/collaboration/models';

/**
 * Interface ChannelsState
 * @interface ChannelsState
 *
 * @description
 * Auxiliary state for {@link ChannelsStore}. The channel rows themselves live
 * in the `withEntities` collection, keyed by their scalar `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelsState {
  /** Organization the loaded list belongs to, or `null` before the first load. */
  readonly organizationId: string | null;
  /**
   * Archive filter currently applied. `null` means the filter is not sent at
   * all, which returns archived and unarchived alike — that is a third state,
   * not a synonym for `false`.
   */
  readonly includeArchived: boolean | null;
  /** Server-reported total, the only sound basis for paging. */
  readonly total: number;
  readonly page: number;
  /** `GET /api/channels`. */
  readonly listCallState: CallState;
  /** `GET /api/channels/{id}`, the only source of a trustworthy `unreadCount`. */
  readonly detailCallState: CallState<ChannelOutput>;
  /** Create, rename, archive and delete. */
  readonly mutationCallState: CallState;
  /** `PATCH /parent` and `PATCH /team`, kept apart so a 409 cycle can be worded distinctly. */
  readonly hierarchyCallState: CallState;
}
