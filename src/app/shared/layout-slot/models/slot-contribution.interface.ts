import type { Type } from '@angular/core';

/**
 * Interface SlotContribution
 * @interface SlotContribution
 *
 * @description
 * A component contributed to an **additive** layout slot. Every contribution
 * renders, stacked by ascending `order`, so each feature publishes its own
 * section instead of a layout owning one monolithic region.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SlotContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Sort key within the slot; lower renders first. */
  readonly order: number;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
}
