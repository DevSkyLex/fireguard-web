/**
 * Interface SetPlanGeometryInput
 * @interface SetPlanGeometryInput
 *
 * @description
 * Body of `PUT /api/organizations/{organizationId}/facilities/{facilityId}/plan-geometry`
 * — draws (or clears) one facility's own outline on a parent floor plan.
 * `points` must hold at least three normalized `[x, y]` pairs; passing both
 * fields `null` clears the geometry.
 *
 * @since 1.4.0
 */
export interface SetPlanGeometryInput {
  /** The floor plan attachment the outline is drawn against, or `null` to clear. */
  readonly attachmentId: string | null;

  /** The polygon's vertices, in order, each a normalized `[x, y]` pair; `null` to clear. */
  readonly points: ReadonlyArray<readonly [number, number]> | null;
}
