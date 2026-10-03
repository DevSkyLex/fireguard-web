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
 *
 * @type
 */
export type FacilityPlanEditMode = 'none' | 'draw-zone' | 'place-pin' | 'calibrate';

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
  /**
   * Property listCallState
   *
   * @description
   * Tracks the plan list request.
   */
  readonly listCallState: CallState;

  /**
   * Property uploadCallState
   *
   * @description
   * Tracks the upload request.
   */
  readonly uploadCallState: CallState<FacilityAttachmentOutput | null>;

  /**
   * Property setPrimaryCallState
   *
   * @description
   * Tracks the set-primary request.
   */
  readonly setPrimaryCallState: CallState<FacilityAttachmentOutput | null>;

  /**
   * Property deleteCallState
   *
   * @description
   * Tracks the delete request.
   */
  readonly deleteCallState: CallState;

  /**
   * Property imageCallState
   *
   * @description
   * Tracks the selected plan's image download.
   */
  readonly imageCallState: CallState;

  /**
   * Property settingPrimaryId
   *
   * @description
   * Id of the plan whose set-primary write is in flight, so only that row locks.
   */
  readonly settingPrimaryId: string | null;

  /**
   * Property deletingId
   *
   * @description
   * Id of the plan whose delete write is in flight, so only that row locks.
   */
  readonly deletingId: string | null;

  /**
   * Property selectedPlanId
   *
   * @description
   * The plan the tab is showing; null defers to the primary-first default.
   */
  readonly selectedPlanId: string | null;

  /**
   * Property selectionRevision
   *
   * @description
   * Advances on explicit context/selection changes even when batched A-B-A returns to the same id.
   */
  readonly selectionRevision: number;

  /**
   * Property imageUrl
   *
   * @description
   * The selected plan's decoded image bytes as a browser object URL, fed to
   * `app-plan-viewer`'s `src`; null while unloaded, loading, or the platform
   * is not the browser. Revoked whenever the selection changes and on
   * destroy — see `withHooks` in {@link FacilityPlansStore}.
   */
  readonly imageUrl: string | null;

  /**
   * Property imageKey
   *
   * @description
   * Context key of the loaded image, including organization, facility and attachment.
   */
  readonly imageKey: string | null;

  /**
   * Property organizationId
   *
   * @description
   * The organization owning the facility, set by `load`. Held here because
   * the overlay endpoint is organization-scoped and its fetch is triggered
   * from the same `withHooks` effect as `loadImage`, not from a page-level
   * call that could pass it directly.
   */
  readonly organizationId: string | null;

  /**
   * Property facilityId
   *
   * @description
   * The facility owning the Plans tab, set by `load`; the editor's write scope.
   */
  readonly facilityId: string | null;

  /**
   * Property overlayCallState
   *
   * @description
   * Tracks the selected plan's overlay (zones/equipment) request.
   */
  readonly overlayCallState: CallState;

  /**
   * Property planOverlay
   *
   * @description
   * The selected plan's zone/equipment overlay; null while unloaded or loading.
   */
  readonly planOverlay: FacilityPlanOverlayOutput | null;

  /**
   * Property overlayKey
   *
   * @description
   * Context key of the loaded annotations.
   */
  readonly overlayKey: string | null;

  /**
   * Property showZones
   *
   * @description
   * Whether the overlay's zone polygons are shown.
   */
  readonly showZones: boolean;

  /**
   * Property showEquipment
   *
   * @description
   * Whether the overlay's equipment pins are shown.
   */
  readonly showEquipment: boolean;

  /**
   * Property editMode
   *
   * @description
   * The editor's current pointer-editing mode.
   */
  readonly editMode: FacilityPlanEditMode;

  /**
   * Property drawTargetFacilityId
   *
   * @description
   * The facility a `draw-zone` outline is being drawn for; null outside that mode.
   */
  readonly drawTargetFacilityId: string | null;

  /**
   * Property draftPoints
   *
   * @description
   * The in-progress `draw-zone` outline's vertices, in normalized `[0, 1]` image coordinates.
   */
  readonly draftPoints: ReadonlyArray<readonly [number, number]>;

  /**
   * Property placeEquipmentId
   *
   * @description
   * The equipment a `place-pin` placement is for; null outside that mode.
   */
  readonly placeEquipmentId: string | null;

  /**
   * Property saveZoneGeometryCallState
   *
   * @description
   * Tracks a zone outline's save (draw finish or clear) request.
   */
  readonly saveZoneGeometryCallState: CallState;

  /**
   * Property savePinPositionCallState
   *
   * @description
   * Tracks an equipment pin's save (place, drag-move, or remove) request.
   */
  readonly savePinPositionCallState: CallState;

  /**
   * Property saveCalibrationCallState
   *
   * @description
   * Tracks the revision-protected calibration write.
   */
  readonly saveCalibrationCallState: CallState;

  /**
   * Property calibrationRevisionCallState
   *
   * @description
   * Tracks a conflict refresh of the attachment revision before retrying calibration.
   */
  readonly calibrationRevisionCallState: CallState;

  /**
   * Property zoneCandidateSearch
   *
   * @description
   * Current zone search and server page.
   */
  readonly zoneCandidateSearch: string;

  /**
   * Property zoneCandidatePage
   *
   * @description
   * Current server page of candidate facilities.
   */
  readonly zoneCandidatePage: number;

  /**
   * Property zoneCandidateTotal
   *
   * @description
   * Candidate facility count over all pages.
   */
  readonly zoneCandidateTotal: number;

  /**
   * Property equipmentCandidateSearch
   *
   * @description
   * Current equipment search.
   */
  readonly equipmentCandidateSearch: string;

  /**
   * Property equipmentCandidatePage
   *
   * @description
   * Current server page of candidate equipment.
   */
  readonly equipmentCandidatePage: number;

  /**
   * Property equipmentCandidateTotal
   *
   * @description
   * Candidate equipment count over all pages.
   */
  readonly equipmentCandidateTotal: number;

  /**
   * Property zoneCandidates
   *
   * @description
   * This facility's direct children of type `zone`/`area`, candidates for `draw-zone`.
   */
  readonly zoneCandidates: ReadonlyArray<FacilityOutput>;

  /**
   * Property zoneCandidatesCallState
   *
   * @description
   * Tracks the `zoneCandidates` request.
   */
  readonly zoneCandidatesCallState: CallState;

  /**
   * Property facilityEquipment
   *
   * @description
   * This facility's assigned equipment, candidates for `place-pin`.
   */
  readonly facilityEquipment: ReadonlyArray<EquipmentOutput>;

  /**
   * Property facilityEquipmentCallState
   *
   * @description
   * Tracks the `facilityEquipment` request.
   */
  readonly facilityEquipmentCallState: CallState;
}
