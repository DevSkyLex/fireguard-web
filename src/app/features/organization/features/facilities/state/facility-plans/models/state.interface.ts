import type { CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  FacilityAttachmentOutput,
  FacilityOutput,
  FacilityPlanOverlayOutput,
} from '@features/organization/features/facilities/models';

/**
 * Type FacilityPlanEditMode
 *
 * @description
 * The Plans tab's current pointer-editing mode: drawing a new zone outline,
 * placing an unplaced equipment item, or neither.
 *
 * @since 1.4.0
 */
export type FacilityPlanEditMode = 'none' | 'draw-zone' | 'place-pin';

/**
 * Interface FacilityPlansState
 * @interface FacilityPlansState
 *
 * @description
 * Auxiliary state for {@link FacilityPlansStore}. The plan entities
 * themselves are managed by `withEntities` — this interface covers the
 * per-action call states, the selection, the selected plan's decoded image
 * bytes, its read-only zone/equipment overlay, and the editor's in-progress
 * draw/place state.
 *
 * @version 1.4.0
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

  /** Tracks the selected plan's image download. */
  readonly imageCallState: CallState;

  /** Id of the plan whose set-primary write is in flight, so only that row locks. */
  readonly settingPrimaryId: string | null;

  /** Id of the plan whose delete write is in flight, so only that row locks. */
  readonly deletingId: string | null;

  /** The plan the tab is showing; null defers to the primary-first default. */
  readonly selectedPlanId: string | null;

  /**
   * The selected plan's decoded image bytes as a browser object URL, fed to
   * `app-plan-viewer`'s `src`; null while unloaded, loading, or the platform
   * is not the browser. Revoked whenever the selection changes and on
   * destroy — see `withHooks` in {@link FacilityPlansStore}.
   */
  readonly planImageUrl: string | null;

  /**
   * The organization owning the facility, set by `load`. Held here because
   * the overlay endpoint is organization-scoped and its fetch is triggered
   * from the same `withHooks` effect as `loadImage`, not from a page-level
   * call that could pass it directly.
   */
  readonly organizationId: string | null;

  /** The facility owning the Plans tab, set by `load`; the editor's write scope. */
  readonly facilityId: string | null;

  /** Tracks the selected plan's overlay (zones/equipment) request. */
  readonly overlayCallState: CallState;

  /** The selected plan's zone/equipment overlay; null while unloaded or loading. */
  readonly overlay: FacilityPlanOverlayOutput | null;

  /** Whether the overlay's zone polygons are shown. */
  readonly showZones: boolean;

  /** Whether the overlay's equipment pins are shown. */
  readonly showEquipment: boolean;

  /** The editor's current pointer-editing mode. */
  readonly editMode: FacilityPlanEditMode;

  /** The facility a `draw-zone` outline is being drawn for; null outside that mode. */
  readonly drawTargetFacilityId: string | null;

  /** The in-progress `draw-zone` outline's vertices, in normalized `[0, 1]` image coordinates. */
  readonly draftPoints: ReadonlyArray<readonly [number, number]>;

  /** The equipment a `place-pin` placement is for; null outside that mode. */
  readonly placeEquipmentId: string | null;

  /** Tracks a zone outline's save (draw finish or clear) request. */
  readonly saveZoneGeometryCallState: CallState;

  /** Tracks an equipment pin's save (place, drag-move, or remove) request. */
  readonly savePinPositionCallState: CallState;

  /** This facility's direct children of type `zone`/`area`, candidates for `draw-zone`. */
  readonly zoneCandidates: ReadonlyArray<FacilityOutput>;

  /** Tracks the `zoneCandidates` request. */
  readonly zoneCandidatesCallState: CallState;

  /** This facility's assigned equipment, candidates for `place-pin`. */
  readonly facilityEquipment: ReadonlyArray<EquipmentOutput>;

  /** Tracks the `facilityEquipment` request. */
  readonly facilityEquipmentCallState: CallState;
}
