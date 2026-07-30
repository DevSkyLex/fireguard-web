/**
 * Interface CalendarConfig
 *
 * @description
 * Presentation configuration for the {@link Calendar}. Layout defaults — week
 * start, month-cell chip cap, day-grid bounds and the offered views — are fixed
 * constants; only the legend needs a per-consumer choice.
 *
 * @since 1.0.0
 */
export interface CalendarConfig {
  /**
   * Id of the category group rendered as a colour legend in the card footer.
   * No legend is shown when absent or when the group id is unknown.
   */
  readonly legendGroupId?: string;
}
