import type { Type } from '@angular/core';

/**
 * Interface SecondaryNavContribution
 * @interface SecondaryNavContribution
 *
 * @description
 * A section contributed to the workspace channel sidebar. The slot is
 * additive and every contribution renders, stacked by `order`, so each feature
 * publishes its own section (business navigation, favorites, channels) instead
 * of the layout owning one monolithic sidebar.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SecondaryNavContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Sort key within the sidebar; lower renders first. */
  readonly order: number;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
}
