import type { CallState } from '@core/request-state';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityPlansState
 * @interface FacilityPlansState
 *
 * @description
 * Auxiliary state for {@link FacilityPlansStore}. The plan entities
 * themselves are managed by `withEntities` — this interface only covers the
 * per-action call states and the selection.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityPlansState {
  /** Tracks the plan list request. */
  readonly listCallState: CallState;

  /** Tracks the upload request. */
  readonly uploadCallState: CallState<FacilityAttachmentOutput | null>;

  /** Tracks the set-primary request. */
  readonly setPrimaryCallState: CallState<FacilityAttachmentOutput | null>;

  /** Tracks the delete request. */
  readonly deleteCallState: CallState;

  /** Id of the plan whose set-primary write is in flight, so only that row locks. */
  readonly settingPrimaryId: string | null;

  /** Id of the plan whose delete write is in flight, so only that row locks. */
  readonly deletingId: string | null;

  /** The plan the tab is showing; null defers to the primary-first default. */
  readonly selectedPlanId: string | null;
}
