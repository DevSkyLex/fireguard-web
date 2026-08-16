/**
 * Interface FacilityPlanGeometry
 * @interface FacilityPlanGeometry
 *
 * @description
 * A facility's own zone outline on one of its parent's floor plans —
 * `FacilityOutput.planGeometry`, present only on the detail read. `points`
 * are normalized 0–1 image coordinates, the same wire format the
 * plan-overlay endpoint uses for a zone polygon.
 *
 * @since 1.0.0
 */
export interface FacilityPlanGeometry {
  /** The floor plan attachment this geometry is drawn against. */
  readonly attachmentId: string;

  /** The polygon's vertices, in order, each a normalized `[x, y]` pair. */
  readonly points: ReadonlyArray<readonly [number, number]>;
}
