/**
 * Interface PlanItemListOption
 * @interface PlanItemListOption
 *
 * @description
 * One row `FacilityPlanItemList` can render: a stable id to activate and
 * select by, the label its own roving-tabindex row shows, and the raw
 * record ({@link data}) projected into the caller's own decorator
 * `ng-template` — a status tag for a zone/room, a status icon+label pair
 * for an equipment pin.
 *
 * @since 1.13.0
 */
export interface PlanItemListOption<T> {
  /** The row's activation/selection id — a facility id or an equipment id, depending on the registry. */
  readonly id: string;

  /** The row's visible label. */
  readonly label: string;

  /** The source record, handed to the caller's decorator `ng-template` unchanged. */
  readonly data: T;
}
