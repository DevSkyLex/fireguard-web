import type { Type } from '@angular/core';

/**
 * Interface PageHeaderContribution
 * @interface PageHeaderContribution
 *
 * @description
 * A component contributed to the dashboard page header action slot (the
 * right-aligned area of the page title banner). Mirrors the topbar slot
 * contract: contributions are sorted by ascending `order` and rendered via
 * `NgComponentOutlet`.
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
