import type { FacilityPlanOverlayZone } from '../facility-plan-overlay/facility-plan-overlay-output.interface';
import type { FacilityStatus } from '../facility/facility-output.interface';

/**
 * Interface FacilityBuildingModelPlan
 * @interface FacilityBuildingModelPlan
 *
 * @description
 * The floor plan attachment a {@link FacilityBuildingModelFloor} is drawn
 * against, with the pixel dimensions its normalized coordinates are
 * relative to. `null` on the owning floor when it has no plan attached yet
 * — never an error condition.
 *
 * @since 1.0.0
 */
export interface FacilityBuildingModelPlan {
  /** The floor plan attachment's id. */
  readonly attachmentId: string;

  /**
   * The plan image's natural pixel width — normalized coordinates are relative
   * to this. `null` when the backend could not probe the image: an SVG whose
   * `width`/`height`/`viewBox` is absent or expressed in percentages or CSS
   * units is accepted and stored undimensioned rather than rejected. A caller
   * deriving an aspect ratio must handle that, not divide blindly.
   */
  readonly imageWidth: number | null;

  /**
   * The plan image's natural pixel height. `null` under the same conditions as
   * {@link FacilityBuildingModelPlan.imageWidth} — the two are always null
   * together.
   */
  readonly imageHeight: number | null;
}

/**
 * Type FacilityBuildingModelOutlineSource
 * @type {FacilityBuildingModelOutlineSource}
 *
 * @description
 * How a floor's {@link FacilityBuildingModelOutline} was derived server-side:
 * from the floor's own drawn `planGeometry`, from the bounding box of its
 * rooms, or from the plan image's full rectangle as a last-resort fallback.
 *
 * @since 1.0.0
 */
export type FacilityBuildingModelOutlineSource = 'plan_geometry' | 'rooms_bbox' | 'image_rect';

/**
 * Interface FacilityBuildingModelOutline
 * @interface FacilityBuildingModelOutline
 *
 * @description
 * The polygon a floor is rendered as in the 3D building view, in normalized
 * `[0, 1]` image coordinates. `null` on the owning floor when none of the
 * three derivations in {@link FacilityBuildingModelOutlineSource} could
 * produce one.
 *
 * @since 1.0.0
 */
export interface FacilityBuildingModelOutline {
  /** How this outline was derived. */
  readonly source: FacilityBuildingModelOutlineSource;

  /** The polygon's vertices, in order, each a normalized `[x, y]` pair. */
  readonly points: ReadonlyArray<readonly [number, number]>;
}

/**
 * Interface FacilityBuildingModelFloor
 * @interface FacilityBuildingModelFloor
 *
 * @description
 * One floor (or other level-bearing facility) of a building, as one layer
 * of the 3D model. Reuses {@link FacilityPlanOverlayZone}'s exact shape for
 * `rooms` — the two endpoints deliberately share it — rather than
 * introducing a lookalike type.
 *
 * `plan` and `outline` arrive as an explicit JSON `null`, not an omitted
 * key: unlike a top-level DTO field, a nested property inside a `floors`
 * array element is always serialized. Type them `T | null`, never
 * `T | null | undefined`.
 *
 * @since 1.0.0
 */
export interface FacilityBuildingModelFloor {
  /** This floor's own facility id. */
  readonly facilityId: string;

  /** This floor's display name. */
  readonly name: string;

  /** This floor's vertical rank within the building, lower first; `null` when unset. */
  readonly levelIndex: number | null;

  /**
   * This floor's business status — {@link FacilityStatus}, never the
   * record lifecycle (`record_status`).
   */
  readonly status: FacilityStatus;

  /** This floor's plan attachment, or `null` when none is set. */
  readonly plan: FacilityBuildingModelPlan | null;

  /** This floor's rendered outline, or `null` when none could be derived. */
  readonly outline: FacilityBuildingModelOutline | null;

  /** The rooms drawn on this floor's plan. */
  readonly rooms: ReadonlyArray<FacilityPlanOverlayZone>;
}

/**
 * Interface FacilityBuildingModelOutput
 * @interface FacilityBuildingModelOutput
 *
 * @description
 * The read-only 3D model for one building facility — its floors, each with
 * its plan, outline and rooms. Returned by
 * `GET /api/organizations/{organizationId}/facilities/{facilityId}/building-model`;
 * not a Hydra item (`FacilityService.getBuildingModel` reads it directly
 * through `HttpClient`, like {@link FacilityPlanOverlayOutput}'s
 * `getPlanOverlay`).
 *
 * `floors` arrives **already ordered by the server**
 * (`level_index ASC NULLS LAST, created_at, id`) — that order is the
 * rendering contract. Never re-sort it on the frontend.
 *
 * @since 1.0.0
 */
export interface FacilityBuildingModelOutput {
  /** The building facility this model was computed for. */
  readonly buildingId: string;

  /** The building facility's display name. */
  readonly buildingName: string;

  /** The building's floors, in server render order. Empty when the building has none yet. */
  readonly floors: ReadonlyArray<FacilityBuildingModelFloor>;
}
