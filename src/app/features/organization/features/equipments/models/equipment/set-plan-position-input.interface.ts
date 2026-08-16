/**
 * Interface SetPlanPositionInput
 * @interface SetPlanPositionInput
 *
 * @description
 * Body of `PUT /api/organizations/{organizationId}/equipment/{equipmentId}/plan-position`
 * — pins (or unpins) one equipment item on its assigned facility's floor
 * plan. Passing every field `null` removes the pin.
 *
 * @since 1.1.0
 */
export interface SetPlanPositionInput {
  /** The floor plan attachment the pin is placed on, or `null` to clear. */
  readonly attachmentId: string | null;

  /** Normalized horizontal position in `[0, 1]`, or `null` to clear. */
  readonly x: number | null;

  /** Normalized vertical position in `[0, 1]`, or `null` to clear. */
  readonly y: number | null;
}
