import type { Type } from '@angular/core';

/**
 * Interface PageHeaderContribution
 * @interface PageHeaderContribution
 *
 * @description
 * A component contributed to the workspace page-header action slot — the
 * right-aligned area carrying the current page's own actions. The slot is
 * additive: contributions are sorted by ascending `order` and rendered via
 * `NgComponentOutlet`.
 *
 * The shape is deliberately identical to the dashboard layout's
 * `PageHeaderContribution` so a feature helper such as
 * `withInterventionHeaderActions()` contributes to either shell unchanged.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PageHeaderContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Ascending sort order within the action slot. */
  readonly order: number;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
}
